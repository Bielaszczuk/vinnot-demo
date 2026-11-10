package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.application.service.SocialPostPresenter;
import com.vinnot.marketing.application.service.SocialPostScheduleService;
import com.vinnot.marketing.application.service.SocialPublishingStarter;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * #510 S2/S3: the publishing sweep finds approved posts whose slot arrived, and a post's status changes only over the
 * status it was read in, so publishing never overwrites a concurrent admin action and the reverse. #513 S5/S6: a reschedule
 * or a publish-now is written only over the status and slot it read, and a publishing start read before it never wins.
 */
@Testcontainers(disabledWithoutDocker = true)
class SocialPostScheduleRacePostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-03T22:00:00Z");
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Suave", "Taninos redondos."),
            new PostCopy.Slide("Origen", "Burdeos."), new PostCopy.Slide("Hoy", "Brinda."));
    private static final List<String> TAGS = List.of("#vinnot", "#merlot", "#vino", "#tinto", "#copa");
    private static final PostCopies COPY = new PostCopies(PostCopy.of(PostLanguage.ES, "Merlot, el tinto amable", SLIDES,
            "Hoy es el día del Merlot.", TAGS, "Copa de vino tinto", "¿Cuál fue tu primer Merlot?"), PostCopy.of(PostLanguage.EN,
            "Merlot, the gentle red", SLIDES, "Today is Merlot day.", TAGS, "A glass of red wine", "What was your first Merlot?"));
    private static final GenerationInfo GENERATED = GenerationInfo.none().succeeded("mock", "x", true, FactCheck.SKIPPED, List.of(), NOW);
    private static JdbcTemplate jdbc;
    private static TransactionTemplate tx;
    private static JdbcSocialPostRepository posts;
    private static JdbcSocialPublicationRepository publications;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        tx = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        posts = new JdbcSocialPostRepository(jdbc, new ObjectMapper());
        publications = new JdbcSocialPublicationRepository(jdbc);
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM social_posts");
        jdbc.update("DELETE FROM users");
    }

    /** The reschedule holds the row; the sweep's start, read before it, waits and then writes nothing. */
    @Test
    void aStartBlockedBehindAnUncommittedRescheduleWritesNothing() throws Exception {
        Instant slot = NOW.minusSeconds(60);
        SocialPost post = approved(slot);
        SocialPost sweepCopy = posts.findById(post.id()).orElseThrow();
        CountDownLatch moved = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<Boolean> admin = CompletableFuture.supplyAsync(() -> tx.execute(status -> {
            post.reschedule(NOW.plus(1, ChronoUnit.DAYS), NOW);
            boolean written = posts.saveScheduleIfUnchanged(post, SocialPostStatus.APPROVED, slot);
            moved.countDown();
            await(release);
            return written;
        }));
        assertThat(moved.await(10, TimeUnit.SECONDS)).isTrue();
        CompletableFuture<Boolean> sweep = CompletableFuture.supplyAsync(() -> tx.execute(status -> {
            sweepCopy.startPublishing(NOW);
            return posts.saveIfStatus(sweepCopy, SocialPostStatus.APPROVED);
        }));
        Thread.sleep(500);
        assertThat(sweep).as("the start waits on the row lock").isNotDone();
        release.countDown();
        assertThat(admin.get(10, TimeUnit.SECONDS)).isTrue();
        assertThat(sweep.get(10, TimeUnit.SECONDS)).as("the start re-checks the moved row").isFalse();
        assertThat(posts.findById(post.id()).orElseThrow()).extracting(SocialPost::status, SocialPost::scheduledFor)
                .containsExactly(SocialPostStatus.APPROVED, NOW.plus(1, ChronoUnit.DAYS));
    }

    /** The sweep holds the row; the reschedule, read before it, waits and then writes nothing. */
    @Test
    void aRescheduleBlockedBehindAnUncommittedStartWritesNothing() throws Exception {
        Instant slot = NOW.minusSeconds(60);
        SocialPost post = approved(slot);
        SocialPost adminCopy = posts.findById(post.id()).orElseThrow();
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<Boolean> sweep = CompletableFuture.supplyAsync(() -> tx.execute(status -> {
            post.startPublishing(NOW);
            boolean written = posts.saveIfStatus(post, SocialPostStatus.APPROVED);
            started.countDown();
            await(release);
            return written;
        }));
        assertThat(started.await(10, TimeUnit.SECONDS)).isTrue();
        CompletableFuture<Boolean> admin = CompletableFuture.supplyAsync(() -> tx.execute(status -> {
            adminCopy.reschedule(NOW.plus(1, ChronoUnit.DAYS), NOW);
            return posts.saveScheduleIfUnchanged(adminCopy, SocialPostStatus.APPROVED, slot);
        }));
        Thread.sleep(500);
        assertThat(admin).isNotDone();
        release.countDown();
        assertThat(sweep.get(10, TimeUnit.SECONDS)).isTrue();
        assertThat(admin.get(10, TimeUnit.SECONDS)).isFalse();
        assertThat(posts.findById(post.id()).orElseThrow()).extracting(SocialPost::status, SocialPost::scheduledFor)
                .containsExactly(SocialPostStatus.SCHEDULED, slot);
    }

    /** A time stored with microseconds (a post moved by SQL with now()) still matches the conditional saves. */
    @Test
    void microsecondTimesStoredOutsideTheAppStillMatch() {
        SocialPost post = approved(NOW.plus(2, ChronoUnit.HOURS));
        jdbc.update("UPDATE social_posts SET scheduled_for = TIMESTAMPTZ '2026-11-03 22:30:00.123456+00' WHERE id = ?", post.id());
        SocialPost read = posts.findById(post.id()).orElseThrow();
        assertThat(read.scheduledFor()).isEqualTo(Instant.parse("2026-11-03T22:30:00.123456Z"));
        read.reschedule(NOW.plus(1, ChronoUnit.DAYS), NOW);
        assertThat(posts.saveScheduleIfUnchanged(read, SocialPostStatus.APPROVED, Instant.parse("2026-11-03T22:30:00.123456Z"))).isTrue();
        SocialPost again = posts.findById(post.id()).orElseThrow();
        again.startPublishing(NOW);
        assertThat(posts.saveIfStatus(again, SocialPostStatus.APPROVED)).isTrue();
    }

    /** Publish now, read before the sweep started the post, answers 409 and creates no publication. */
    @Test
    void publishNowLosingToTheSweepWritesNothing() {
        PublishingSettings settings = new PublishingSettings(true, EnumSet.of(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK),
                Duration.ofHours(6), ZoneId.of("America/Argentina/Buenos_Aires"), Map.of(SocialNetwork.TIKTOK, LocalTime.of(19, 30)));
        SocialPublishQueue queue = mock(SocialPublishQueue.class);
        SocialPublishingStarter starter = new SocialPublishingStarter(posts, publications, queue, mock(SocialPublishingNotices.class), settings);
        SocialPostScheduleService service = new SocialPostScheduleService(posts, starter, settings, WeeklyPlanner.Settings.defaults(),
                mock(SocialPostPresenter.class));
        Instant slot = NOW.plus(3, ChronoUnit.HOURS);
        SocialPost post = approved(slot);
        SocialPost sweepCopy = posts.findById(post.id()).orElseThrow();
        sweepCopy.startPublishing(NOW);
        assertThat(posts.saveIfStatus(sweepCopy, SocialPostStatus.APPROVED)).isTrue();

        assertThatThrownBy(() -> tx.execute(status -> service.publishNow(post.id(), NOW))).isInstanceOf(InvalidPostTransitionException.class);
        assertThat(publications.findByPost(post.id())).isEmpty();
        verifyNoInteractions(queue);
        assertThat(posts.findById(post.id()).orElseThrow()).extracting(SocialPost::status, SocialPost::scheduledFor)
                .containsExactly(SocialPostStatus.SCHEDULED, slot);
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static SocialPost approved(Instant slot) {
        SocialPost post = withCopy(slot);
        SocialPostMedia ready = rendered(post, post.media());
        assertThat(posts.saveMedia(post.id(), post.media(), ready)).isTrue();
        SocialPost stored = posts.findById(post.id()).orElseThrow();
        stored.approve(user(), NOW);
        posts.save(stored);
        return posts.findById(post.id()).orElseThrow();
    }

    private static SocialPost withCopy(Instant slot) {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), slot, "CURIOUS_FACT", null, NOW);
        post.copyGenerated(COPY, GENERATED, NOW);
        posts.save(post);
        return post;
    }

    private static SocialPostMedia rendered(SocialPost post, SocialPostMedia media) {
        String prefix = "posts/" + post.id() + "/";
        SocialPostMedia.SlideImages images = new SocialPostMedia.SlideImages(
                List.of(new SocialPostMedia.Image(prefix + "instagram-01.jpg", "https://cdn/" + prefix + "instagram-01.jpg")),
                List.of(new SocialPostMedia.Image(prefix + "tiktok-01.jpg", "https://cdn/" + prefix + "tiktok-01.jpg")));
        return media.attempted(NOW).withIllustration(SocialPostMedia.Illustration.fallback(media.illustrationVersion(), "grapes",
                "AI_IMAGE_DISABLED"), NOW).rendered(Map.of(PostLanguage.ES, images, PostLanguage.EN, images), NOW);
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users (id, email, username, password, first_name, last_name, preferred_language, email_verified)
                VALUES (?, ?, ?, 'hash', 'A', 'B', 'es', true)
                """, id, "owner-" + id + "@vinnot.test", "owner-" + id);
        return id;
    }
}
