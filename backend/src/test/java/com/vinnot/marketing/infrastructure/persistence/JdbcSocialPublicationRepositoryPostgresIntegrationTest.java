package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPublication;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S3 (V82): one publication per post and network round-trips, and only one worker claims a queued publication. */
@Testcontainers(disabledWithoutDocker = true)
class JdbcSocialPublicationRepositoryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-03T22:00:00Z");
    private static final Instant LATER = NOW.plusSeconds(90);
    private static final Instant TUESDAY = Instant.parse("2026-11-03T22:00:00Z");
    private static final Instant SATURDAY = Instant.parse("2026-11-07T22:00:00Z");
    private static JdbcTemplate jdbc;
    private static JdbcSocialPostRepository posts;
    private static JdbcSocialPublicationRepository publications;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        posts = new JdbcSocialPostRepository(jdbc, new ObjectMapper());
        publications = new JdbcSocialPublicationRepository(jdbc);
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM social_posts");
    }

    @Test
    void aPublicationRoundTripsThroughEveryTransition() {
        UUID post = post(SATURDAY);
        SocialPublication publication = SocialPublication.queued(UUID.randomUUID(), post, SocialNetwork.INSTAGRAM, NOW);
        publications.save(publication);
        assertThat(publications.findById(publication.id())).get().usingRecursiveComparison().isEqualTo(publication);

        publication.started(NOW.plusSeconds(10));
        publication.retryLater("RATE_LIMITED", NOW.plusSeconds(20));
        publications.save(publication);
        SocialPublication retrying = publications.findById(publication.id()).orElseThrow();
        assertThat(retrying.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(retrying.error()).isEqualTo("RATE_LIMITED");
        assertThat(retrying.attempts()).isEqualTo(1);

        publication.started(NOW.plusSeconds(30));
        publication.published("17890", "https://www.instagram.com/p/abc/", LATER);
        publications.save(publication);
        SocialPublication published = publications.findById(publication.id()).orElseThrow();
        assertThat(published).usingRecursiveComparison().isEqualTo(publication);
        assertThat(published.status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(published.externalId()).isEqualTo("17890");
        assertThat(published.permalink()).isEqualTo("https://www.instagram.com/p/abc/");
        assertThat(published.attempts()).isEqualTo(2);
        assertThat(published.error()).isNull();
        assertThat(published.publishedAt()).isEqualTo(LATER);
        assertThat(published.createdAt()).isEqualTo(NOW);
        assertThat(published.updatedAt()).isEqualTo(LATER);

        assertThat(publications.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    void aPostHasOnePublicationPerNetworkListedInNetworkOrder() {
        UUID post = post(SATURDAY);
        for (SocialNetwork network : new SocialNetwork[] {SocialNetwork.TIKTOK, SocialNetwork.INSTAGRAM, SocialNetwork.THREADS,
                SocialNetwork.FACEBOOK}) {
            publications.save(SocialPublication.queued(UUID.randomUUID(), post, network, NOW));
        }
        publications.save(SocialPublication.queued(UUID.randomUUID(), post(TUESDAY), SocialNetwork.INSTAGRAM, NOW));

        assertThat(publications.findByPost(post)).extracting(SocialPublication::network).containsExactly(SocialNetwork.INSTAGRAM,
                SocialNetwork.FACEBOOK, SocialNetwork.THREADS, SocialNetwork.TIKTOK);
        assertThat(publications.findByPost(UUID.randomUUID())).isEmpty();
        assertThatThrownBy(() -> publications.save(SocialPublication.queued(UUID.randomUUID(), post, SocialNetwork.TIKTOK, NOW)))
                .as("one publication per post and network").isInstanceOf(DuplicateKeyException.class);
        assertThatThrownBy(() -> publications.save(SocialPublication.queued(UUID.randomUUID(), UUID.randomUUID(), SocialNetwork.TIKTOK,
                NOW))).as("the post must exist").isInstanceOf(DataIntegrityViolationException.class);

        jdbc.update("DELETE FROM social_posts WHERE id = ?", post);
        assertThat(publications.findByPost(post)).as("deleting the post deletes its publications").isEmpty();
    }

    @Test
    void claimingMovesAQueuedPublicationToPublishingOnce() {
        SocialPublication publication = SocialPublication.queued(UUID.randomUUID(), post(SATURDAY), SocialNetwork.FACEBOOK, NOW);
        publications.save(publication);

        assertThat(publications.claim(publication.id(), LATER)).isTrue();
        assertThat(publications.claim(publication.id(), LATER)).as("a second claim finds it publishing").isFalse();

        SocialPublication claimed = publications.findById(publication.id()).orElseThrow();
        assertThat(claimed.status()).isEqualTo(PublicationStatus.PUBLISHING);
        assertThat(claimed.attempts()).isEqualTo(1);
        assertThat(claimed.updatedAt()).isEqualTo(LATER);
        assertThat(publications.claim(UUID.randomUUID(), LATER)).as("a publication that is gone").isFalse();
    }

    @Test
    void concurrentClaimsLetOnlyOneWorkerPublish() throws Exception {
        SocialPublication publication = SocialPublication.queued(UUID.randomUUID(), post(SATURDAY), SocialNetwork.THREADS, NOW);
        publications.save(publication);
        int workers = 8;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        try {
            Callable<Boolean> claim = () -> {
                start.await();
                return publications.claim(publication.id(), LATER);
            };
            List<Future<Boolean>> results = new ArrayList<>();
            for (int worker = 0; worker < workers; worker++) {
                results.add(pool.submit(claim));
            }
            start.countDown();
            int won = 0;
            for (Future<Boolean> result : results) {
                won += result.get(30, TimeUnit.SECONDS) ? 1 : 0;
            }
            assertThat(won).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(publications.findById(publication.id()).orElseThrow().attempts()).isEqualTo(1);
    }

    @Test
    void aConditionalSaveWritesOnlyOverTheStatusItWasReadIn() {
        SocialPublication publication = SocialPublication.queued(UUID.randomUUID(), post(SATURDAY), SocialNetwork.INSTAGRAM, NOW);
        publication.failed("TOKEN_INVALID", NOW);
        publications.save(publication);
        SocialPublication first = publications.findById(publication.id()).orElseThrow();
        SocialPublication second = publications.findById(publication.id()).orElseThrow();

        first.retry(LATER);
        second.retry(LATER.plusSeconds(1));
        assertThat(publications.saveIfStatus(first, PublicationStatus.FAILED)).isTrue();
        assertThat(publications.saveIfStatus(second, PublicationStatus.FAILED)).as("the second retry finds it queued").isFalse();

        SocialPublication stored = publications.findById(publication.id()).orElseThrow();
        assertThat(stored.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(stored.error()).isNull();
        assertThat(stored.attempts()).isZero();
        assertThat(stored.updatedAt()).isEqualTo(LATER);
        assertThat(publications.saveIfStatus(SocialPublication.queued(UUID.randomUUID(), post(TUESDAY), SocialNetwork.TIKTOK, NOW),
                PublicationStatus.QUEUED)).as("a publication that is not stored is not inserted").isFalse();
    }

    @Test
    void concurrentRetriesMoveAFailedPublicationBackToQueuedOnce() throws Exception {
        SocialPublication publication = SocialPublication.queued(UUID.randomUUID(), post(SATURDAY), SocialNetwork.THREADS, NOW);
        publication.failed("REJECTED", NOW);
        publications.save(publication);
        int admins = 2;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(admins);
        try {
            Callable<Boolean> retry = () -> {
                SocialPublication read = publications.findById(publication.id()).orElseThrow();
                read.retry(LATER);
                start.await();
                return publications.saveIfStatus(read, PublicationStatus.FAILED);
            };
            List<Future<Boolean>> results = new ArrayList<>();
            for (int admin = 0; admin < admins; admin++) {
                results.add(pool.submit(retry));
            }
            start.countDown();
            int won = 0;
            for (Future<Boolean> result : results) {
                won += result.get(30, TimeUnit.SECONDS) ? 1 : 0;
            }
            assertThat(won).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(publications.findById(publication.id()).orElseThrow().status()).isEqualTo(PublicationStatus.QUEUED);
    }

    @Test
    void theSucceededPublicationsSinceAMomentAreTheOnesToMeasure() {
        UUID post = post(SATURDAY);
        SocialPublication instagram = succeeded(post, SocialNetwork.INSTAGRAM, LATER, false);
        SocialPublication tiktok = succeeded(post, SocialNetwork.TIKTOK, LATER.plusSeconds(5), true);
        SocialPublication old = succeeded(post(TUESDAY), SocialNetwork.INSTAGRAM, NOW.minusSeconds(86_400), false);
        SocialPublication failed = SocialPublication.queued(UUID.randomUUID(), post, SocialNetwork.FACEBOOK, NOW);
        failed.failed("TOKEN_INVALID", LATER);
        publications.save(failed);
        SocialPublication queued = SocialPublication.queued(UUID.randomUUID(), post, SocialNetwork.THREADS, NOW);
        publications.save(queued);

        assertThat(publications.findSucceededSince(NOW)).extracting(SocialPublication::id).containsExactly(instagram.id(), tiktok.id());
        assertThat(publications.findSucceededSince(NOW.minusSeconds(2 * 86_400))).extracting(SocialPublication::id)
                .containsExactly(old.id(), instagram.id(), tiktok.id());
        assertThat(publications.findSucceededSince(LATER.plusSeconds(5))).extracting(SocialPublication::id).containsExactly(tiktok.id());

        jdbc.update("UPDATE social_publications SET external_id = NULL WHERE id = ?", instagram.id());
        assertThat(publications.findSucceededSince(NOW)).as("nothing to read without a network id").extracting(SocialPublication::id)
                .containsExactly(tiktok.id());
    }

    @Test
    void theDraftsSentSinceAMomentAreListedOldestFirstUpToTheLimit() {
        UUID saturday = post(SATURDAY);
        SocialPublication older = succeeded(saturday, SocialNetwork.TIKTOK, LATER, true);
        SocialPublication newer = succeeded(post(TUESDAY), SocialNetwork.TIKTOK, LATER.plusSeconds(60), true);
        SocialPublication tooOld = succeeded(post(SATURDAY.plusSeconds(86_400)), SocialNetwork.TIKTOK, NOW.minusSeconds(86_400), true);
        succeeded(saturday, SocialNetwork.INSTAGRAM, LATER, false);
        SocialPublication posted = succeeded(post(TUESDAY.plusSeconds(86_400)), SocialNetwork.TIKTOK, LATER, true);
        posted.draftPosted("https://www.tiktok.com/@vinnot/photo/7311", LATER.plusSeconds(120));
        assertThat(publications.saveIfStatus(posted, PublicationStatus.DRAFT_SENT)).isTrue();

        assertThat(publications.findDraftsSentSince(NOW, 10)).extracting(SocialPublication::id).containsExactly(older.id(), newer.id());
        assertThat(publications.findDraftsSentSince(NOW, 1)).extracting(SocialPublication::id).containsExactly(older.id());
        assertThat(publications.findDraftsSentSince(NOW.minusSeconds(2 * 86_400), 10)).extracting(SocialPublication::id)
                .containsExactly(tooOld.id(), older.id(), newer.id());
        assertThat(publications.findDraftsSentSince(NOW, 10).getFirst()).usingRecursiveComparison().isEqualTo(older);

        SocialPublication stored = publications.findById(posted.id()).orElseThrow();
        assertThat(stored.status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(stored.externalId()).isEqualTo("draft-TIKTOK");
        assertThat(stored.permalink()).isEqualTo("https://www.tiktok.com/@vinnot/photo/7311");
        assertThat(stored.publishedAt()).isEqualTo(LATER.plusSeconds(120));
        assertThat(publications.saveIfStatus(posted, PublicationStatus.DRAFT_SENT)).as("a second sweep finds it published").isFalse();

        jdbc.update("UPDATE social_publications SET external_id = NULL WHERE id = ?", older.id());
        assertThat(publications.findDraftsSentSince(NOW, 10)).as("nothing to check without a network id")
                .extracting(SocialPublication::id).containsExactly(newer.id());
    }

    private static SocialPublication succeeded(UUID post, SocialNetwork network, Instant at, boolean draft) {
        SocialPublication publication = SocialPublication.queued(UUID.randomUUID(), post, network, NOW.minusSeconds(3 * 86_400));
        publication.started(at);
        if (draft) {
            publication.draftSent("draft-" + network, at);
        } else {
            publication.published("id-" + network + "-" + at.getEpochSecond(), null, at);
        }
        publications.save(publication);
        return publication;
    }

    private static UUID post(Instant slot) {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), slot, "CURIOUS_FACT", null, NOW);
        posts.save(post);
        return post.id();
    }
}
