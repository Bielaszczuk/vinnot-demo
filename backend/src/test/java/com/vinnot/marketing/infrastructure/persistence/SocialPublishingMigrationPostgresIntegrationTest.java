package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostPublishing;
import com.vinnot.marketing.domain.model.PostReview;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * #510 (V82): additive only. Stored posts keep everything and have no publishing record, every pillar starts without
 * auto-approval, the admin switch is stored per pillar, and a post's publishing record round-trips.
 */
@Testcontainers(disabledWithoutDocker = true)
class SocialPublishingMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant SLOT = Instant.parse("2026-11-07T22:00:00Z");
    private static final UUID STORED = UUID.randomUUID();
    private static final String STORED_COPY = """
            {"es": {"hook": "Merlot, el tinto amable", "slides": [{"title": "Suave", "body": "Taninos redondos."},
             {"title": "Origen", "body": "Burdeos."}, {"title": "Hoy", "body": "Brinda."}], "caption": "Hoy es el día del Merlot.",
             "hashtags": ["#vinnot", "#merlot", "#vino", "#tinto", "#copa"], "altText": "Copa", "cta": "¿Y tú?"}}
            """;
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Suave", "Taninos redondos."),
            new PostCopy.Slide("Origen", "Burdeos."), new PostCopy.Slide("Hoy", "Brinda."));
    private static final PostCopies COPY = new PostCopies(
            PostCopy.of(PostLanguage.ES, "Merlot, el tinto amable", SLIDES, "Hoy es el día del Merlot.",
                    List.of("#vinnot", "#merlot", "#vino", "#tinto", "#copa"), "Copa de vino tinto", "¿Cuál fue tu primer Merlot?"),
            PostCopy.of(PostLanguage.EN, "Merlot, the gentle red", SLIDES, "Today is Merlot day.",
                    List.of("#vinnot", "#merlot", "#wine", "#redwine", "#glass"), "A glass of red wine", "What was your first Merlot?"));
    private static final GenerationInfo GENERATED = GenerationInfo.none().succeeded("mock", "x", true, FactCheck.SKIPPED, List.of(), NOW);
    private static final SocialPostMedia.SlideImages IMAGES = new SocialPostMedia.SlideImages(
            List.of(new SocialPostMedia.Image("posts/p/ig-1.jpg", "https://cdn.vinnot.app/ig-1.jpg")),
            List.of(new SocialPostMedia.Image("posts/p/tt-1.jpg", "https://cdn.vinnot.app/tt-1.jpg")));
    private static JdbcTemplate jdbc;
    private static JdbcSocialPostRepository posts;
    private static JdbcContentPillarCatalog pillars;

    @BeforeAll
    static void migrateWithAPostStoredBeforeV82() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("81").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("""
                INSERT INTO social_posts (id, status, scheduled_for, pillar_code, copy, generation, created_at, updated_at)
                VALUES (?, 'APPROVED', ?, 'CURIOUS_FACT', CAST(? AS jsonb), CAST('{"attempts": 1}' AS jsonb), ?, ?)
                """, STORED, Timestamp.from(SLOT), STORED_COPY, Timestamp.from(NOW), Timestamp.from(NOW));
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        posts = new JdbcSocialPostRepository(jdbc, new ObjectMapper());
        pillars = new JdbcContentPillarCatalog(jdbc);
    }

    @AfterEach
    void turnAutoApprovalOff() {
        jdbc.update("UPDATE content_pillars SET auto_approve = FALSE");
        jdbc.update("DELETE FROM social_posts WHERE id <> ?", STORED);
    }

    @Test
    void aPostStoredBeforeKeepsEverythingAndHasNoPublishingRecord() {
        SocialPost stored = posts.findById(STORED).orElseThrow();

        assertThat(stored.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(stored.copies().es().hook()).isEqualTo("Merlot, el tinto amable");
        assertThat(stored.publishing()).isNull();
        assertThat(jdbc.queryForObject("SELECT publishing IS NULL FROM social_posts WHERE id = ?", Boolean.class, STORED)).isTrue();
    }

    @Test
    void everyPillarStartsWithoutAutoApprovalAndTheSwitchIsStoredPerPillar() {
        assertThat(pillars.all()).hasSizeGreaterThanOrEqualTo(9).noneMatch(ContentPillar::autoApprove);

        pillars.setAutoApprove("CURIOUS_FACT", true);
        assertThat(pillars.all()).filteredOn(ContentPillar::autoApprove).extracting(ContentPillar::code).containsExactly("CURIOUS_FACT");
        pillars.setAutoApprove("CURIOUS_FACT", true);
        assertThat(pillars.all()).filteredOn(ContentPillar::autoApprove).hasSize(1);

        pillars.setAutoApprove("CURIOUS_FACT", false);
        assertThat(pillars.all()).noneMatch(ContentPillar::autoApprove);
        assertThat(pillars.all()).extracting(ContentPillar::code).as("the rotation order stays").startsWith("WINE_DAY", "CURIOUS_FACT");
    }

    @Test
    void anUnknownPillarIsNotFound() {
        assertThatThrownBy(() -> pillars.setAutoApprove("NOPE", true)).isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("NOPE");
    }

    @Test
    void aPostsPublishingRecordRoundTrips() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SLOT.plusSeconds(86_400), "CURIOUS_FACT", null, NOW);
        post.copyGenerated(COPY, GENERATED, NOW);
        post.autoApprove(NOW.plusSeconds(10));
        posts.save(post);
        assertThat(posts.saveMedia(post.id(), post.media(), post.media().rendered(Map.of(PostLanguage.ES, IMAGES, PostLanguage.EN, IMAGES),
                NOW.plusSeconds(20)))).isTrue();
        SocialPost approved = posts.findById(post.id()).orElseThrow();
        assertThat(approved.review()).isEqualTo(PostReview.automatic(NOW.plusSeconds(10)));
        assertThat(approved.review().isAutomatic()).isTrue();
        assertThat(approved.publishing()).isNull();

        approved.startPublishing(NOW.plusSeconds(30));
        posts.save(approved);
        SocialPost scheduled = posts.findById(post.id()).orElseThrow();
        assertThat(scheduled.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(scheduled.publishing()).isEqualTo(new PostPublishing(NOW.plusSeconds(30), null, null));
        assertThat(scheduled.media()).as("the rendered media stays").isEqualTo(approved.media());

        scheduled.publishingFailed("TOKEN_INVALID", NOW.plusSeconds(40));
        posts.save(scheduled);
        assertThat(posts.findById(post.id()).orElseThrow().publishing())
                .isEqualTo(new PostPublishing(NOW.plusSeconds(30), NOW.plusSeconds(40), "TOKEN_INVALID"));
        assertThat(jdbc.queryForObject("SELECT publishing ->> 'error' FROM social_posts WHERE id = ?", String.class, post.id()))
                .isEqualTo("TOKEN_INVALID");
    }

    @Test
    void theAccountsTableOnlyTakesKnownNetworksAndStatuses() {
        jdbc.update("""
                INSERT INTO social_accounts (network, account_id, access_token_ciphertext, status, connected_at, updated_at)
                VALUES ('THREADS', '1789', 'cipher', 'CONNECTED', ?, ?)
                """, Timestamp.from(NOW), Timestamp.from(NOW));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM social_accounts", Integer.class)).isEqualTo(1);

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO social_accounts (network, account_id, access_token_ciphertext, status, connected_at, updated_at)
                VALUES ('MYSPACE', '1', 'cipher', 'CONNECTED', ?, ?)
                """, Timestamp.from(NOW), Timestamp.from(NOW))).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO social_accounts (network, account_id, access_token_ciphertext, status, connected_at, updated_at)
                VALUES ('TIKTOK', '1', 'cipher', 'EXPIRED', ?, ?)
                """, Timestamp.from(NOW), Timestamp.from(NOW))).isInstanceOf(DataIntegrityViolationException.class);
        jdbc.update("DELETE FROM social_accounts");
    }
}
