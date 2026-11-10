package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostReview;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
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
 * #510 (V83): every pillar stays active and keeps its auto-approval, the admin's active switch is stored per pillar, and an
 * approval by the system is written only over the exact pending post it read.
 */
@Testcontainers(disabledWithoutDocker = true)
class SocialPillarSwitchesPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant SLOT = Instant.parse("2026-11-03T22:00:00Z");
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Suave", "Taninos redondos."),
            new PostCopy.Slide("Origen", "Burdeos."), new PostCopy.Slide("Hoy", "Brinda."));
    private static final PostCopy SPANISH = PostCopy.of(PostLanguage.ES, "Merlot, el tinto amable", SLIDES, "Hoy es el día del Merlot.",
            List.of("#vinnot", "#merlot", "#vino", "#tinto", "#copa"), "Copa de vino tinto", "¿Cuál fue tu primer Merlot?");
    private static final PostCopies COPY = new PostCopies(SPANISH,
            PostCopy.of(PostLanguage.EN, "Merlot, the gentle red", SLIDES, "Today is Merlot day.",
                    List.of("#vinnot", "#merlot", "#wine", "#redwine", "#glass"), "A glass of red wine", "What was your first Merlot?"));
    private static final GenerationInfo GENERATED = GenerationInfo.none().succeeded("openai", "gpt-4o-mini", false, FactCheck.PASSED,
            List.of(), NOW);
    private static final SocialPostMedia.SlideImages IMAGES = new SocialPostMedia.SlideImages(
            List.of(new SocialPostMedia.Image("posts/p/ig-1.jpg", "https://cdn.vinnot.app/ig-1.jpg")),
            List.of(new SocialPostMedia.Image("posts/p/tt-1.jpg", "https://cdn.vinnot.app/tt-1.jpg")));
    private static JdbcTemplate jdbc;
    private static JdbcSocialPostRepository posts;
    private static JdbcContentPillarCatalog pillars;
    private static int slot;

    @BeforeAll
    static void migrateWithAnAutoApprovingPillarBeforeV83() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("82").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("UPDATE content_pillars SET auto_approve = TRUE WHERE code = 'EDUCATION'");
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("83").load().migrate();
        posts = new JdbcSocialPostRepository(jdbc, new ObjectMapper());
        pillars = new JdbcContentPillarCatalog(jdbc);
    }

    @AfterEach
    void clean() {
        jdbc.update("UPDATE content_pillars SET active = TRUE");
        jdbc.update("DELETE FROM social_posts");
    }

    @Test
    void everyPillarStaysActiveAndKeepsItsAutoApproval() {
        assertThat(pillars.all()).hasSize(9).allMatch(ContentPillar::active);
        assertThat(pillars.all()).filteredOn(ContentPillar::autoApprove).extracting(ContentPillar::code).containsExactly("EDUCATION");
    }

    @Test
    void theActiveSwitchIsStoredPerPillar() {
        pillars.setActive("HUMOR", false);
        assertThat(pillars.all()).filteredOn(pillar -> !pillar.active()).extracting(ContentPillar::code).containsExactly("HUMOR");
        pillars.setActive("HUMOR", false);
        assertThat(pillars.all()).filteredOn(pillar -> !pillar.active()).hasSize(1);

        pillars.setActive("HUMOR", true);
        assertThat(pillars.all()).allMatch(ContentPillar::active);
        assertThat(pillars.all()).extracting(ContentPillar::code).as("the rotation order stays").startsWith("WINE_DAY", "CURIOUS_FACT");
    }

    @Test
    void anUnknownPillarIsNotFound() {
        assertThatThrownBy(() -> pillars.setActive("NOPE", false)).isInstanceOf(EntityNotFoundException.class).hasMessageContaining("NOPE");
    }

    @Test
    void anUnchangedPendingPostIsApprovedBySystem() {
        SocialPost read = storedReadyPending();
        Instant storedAt = read.updatedAt();
        SocialPostMedia storedMedia = read.media();

        read.autoApprove(NOW.plusSeconds(60));

        assertThat(posts.saveApprovalIfUnchanged(read, storedAt, storedMedia)).isTrue();
        SocialPost approved = posts.findById(read.id()).orElseThrow();
        assertThat(approved.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(approved.review()).isEqualTo(PostReview.automatic(NOW.plusSeconds(60)));
        assertThat(approved.updatedAt()).isEqualTo(NOW.plusSeconds(60));
        assertThat(approved.media()).as("the media stays").isEqualTo(storedMedia);
        assertThat(approved.copies()).isEqualTo(COPY);
    }

    @Test
    void anAdminEditOrRejectionMeanwhileWins() {
        SocialPost rejected = storedReadyPending();
        Instant storedAt = rejected.updatedAt();
        jdbc.update("UPDATE social_posts SET status = 'REJECTED', review_reason = 'Off brand', updated_at = ? WHERE id = ?",
                Timestamp.from(NOW.plusSeconds(30)), rejected.id());
        rejected.autoApprove(NOW.plusSeconds(60));
        assertThat(posts.saveApprovalIfUnchanged(rejected, storedAt, rejected.media())).isFalse();
        assertThat(posts.findById(rejected.id()).orElseThrow().status()).isEqualTo(SocialPostStatus.REJECTED);

        SocialPost edited = storedReadyPending();
        Instant editedStoredAt = edited.updatedAt();
        jdbc.update("UPDATE social_posts SET updated_at = ? WHERE id = ?", Timestamp.from(NOW.plusSeconds(30)), edited.id());
        edited.autoApprove(NOW.plusSeconds(60));
        assertThat(posts.saveApprovalIfUnchanged(edited, editedStoredAt, edited.media())).as("still pending, but edited").isFalse();
        assertThat(posts.findById(edited.id()).orElseThrow().status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
    }

    @Test
    void aPostNoLongerPendingIsNotApprovedAgain() {
        SocialPost read = storedReadyPending();
        Instant storedAt = read.updatedAt();
        jdbc.update("UPDATE social_posts SET status = 'APPROVED' WHERE id = ?", read.id());

        read.autoApprove(NOW.plusSeconds(60));
        assertThat(posts.saveApprovalIfUnchanged(read, storedAt, read.media())).isFalse();
        assertThat(posts.findById(read.id()).orElseThrow().review()).as("untouched").isNull();
    }

    @Test
    void newMediaFromTheRenderJobMeanwhileWins() {
        SocialPost read = storedReadyPending();
        Instant storedAt = read.updatedAt();
        SocialPostMedia storedMedia = read.media();
        assertThat(posts.saveMedia(read.id(), storedMedia, storedMedia.newIllustration(NOW.plusSeconds(30)))).isTrue();

        read.autoApprove(NOW.plusSeconds(60));
        assertThat(posts.saveApprovalIfUnchanged(read, storedAt, storedMedia)).isFalse();
        assertThat(posts.findById(read.id()).orElseThrow().status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
    }

    /** A pending post with its Spanish and English slides rendered, as the auto-approval job reads it. */
    private static SocialPost storedReadyPending() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SLOT.plusSeconds(3600L * slot++), "EDUCATION", null, NOW);
        post.copyGenerated(COPY, GENERATED, NOW.plusSeconds(10));
        posts.save(post);
        assertThat(posts.saveMedia(post.id(), post.media(), post.media().rendered(Map.of(PostLanguage.ES, IMAGES, PostLanguage.EN, IMAGES),
                NOW.plusSeconds(20)))).isTrue();
        SocialPost read = posts.findById(post.id()).orElseThrow();
        assertThat(read.readyToPublish()).isTrue();
        return read;
    }
}
