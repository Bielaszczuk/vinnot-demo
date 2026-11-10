package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.application.service.SocialPublishingStarter;
import com.vinnot.marketing.application.service.SocialPublishingSweepService;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * #510 S2/S3: the publishing sweep finds approved posts whose slot arrived, and a post's status changes only over the
 * status it was read in, so publishing never overwrites a concurrent admin action and the reverse. #513 S5/S6: a reschedule
 * or a publish-now is written only over the status and slot it read, and a publishing start read before it never wins.
 */
@Testcontainers(disabledWithoutDocker = true)
class JdbcSocialPostPublishingPostgresIntegrationTest {
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
        jdbc.update("DELETE FROM users");
    }

    @Test
    void theSweepFindsApprovedPostsWhoseSlotArrivedWithinTheWindowEarliestFirst() {
        Instant windowStart = NOW.minus(12, ChronoUnit.HOURS);
        SocialPost late = approved(NOW.minus(1, ChronoUnit.HOURS));
        SocialPost early = approved(NOW.minus(11, ChronoUnit.HOURS));
        SocialPost exactlyNow = approved(NOW);
        approved(NOW.plusSeconds(1));
        SocialPost atWindowStart = approved(windowStart);
        SocialPost stale = approved(NOW.minus(2, ChronoUnit.DAYS));
        SocialPost pending = withCopy(NOW.minus(3, ChronoUnit.HOURS));

        assertThat(posts.findDueForPublishing(windowStart, NOW, 10)).extracting(SocialPost::id)
                .containsExactly(early.id(), late.id(), exactlyNow.id())
                .as("the window start is exclusive and older slots are never due")
                .doesNotContain(atWindowStart.id(), stale.id(), pending.id());
        assertThat(posts.findDueForPublishing(windowStart, NOW, 2)).extracting(SocialPost::id).containsExactly(early.id(), late.id());
    }

    @Test
    void enablingPublishingNeverPublishesTheOldApprovedBacklog() {
        SocialPost stale = approved(NOW.minus(60, ChronoUnit.DAYS));
        SocialPost late = approved(NOW.minus(5, ChronoUnit.HOURS));
        SocialPublishQueue queue = mock(SocialPublishQueue.class);
        SocialPublishingNotices notices = mock(SocialPublishingNotices.class);
        PublishingSettings settings = new PublishingSettings(true, EnumSet.of(SocialNetwork.INSTAGRAM), Duration.ofHours(6));
        SocialPublishingSweepService sweep = new SocialPublishingSweepService(posts,
                new SocialPublishingStarter(posts, publications, queue, notices, settings), settings);

        assertThat(sweep.startDue(NOW)).as("only the post inside the window starts").isEqualTo(1);

        assertThat(posts.findById(stale.id()).orElseThrow().status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(publications.findByPost(stale.id())).as("the stale post gets no publication").isEmpty();
        assertThat(posts.findById(late.id()).orElseThrow().status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(publications.findByPost(late.id())).extracting(SocialPublication::network).containsExactly(SocialNetwork.INSTAGRAM);
        verify(queue).enqueue(publications.findByPost(late.id()).get(0).id(), Duration.ZERO);
        verifyNoInteractions(notices);
    }

    @Test
    void aConditionalSaveWritesOnlyOverTheStatusItWasReadIn() {
        SocialPost post = approved(NOW.minusSeconds(60));
        SocialPost adminCopy = posts.findById(post.id()).orElseThrow();

        post.startPublishing(NOW);
        assertThat(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).isTrue();
        SocialPost stored = posts.findById(post.id()).orElseThrow();
        assertThat(stored.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(stored.publishing().startedAt()).isEqualTo(NOW);
        assertThat(stored.media()).isEqualTo(post.media());

        adminCopy.reject(user(), "Tarde", NOW);
        assertThat(posts.saveIfStatus(adminCopy, SocialPostStatus.APPROVED)).as("the post is no longer approved").isFalse();
        assertThat(posts.findById(post.id()).orElseThrow().status()).isEqualTo(SocialPostStatus.SCHEDULED);

        post.publishingSucceeded(NOW.plusSeconds(30));
        assertThat(posts.saveIfStatus(post, SocialPostStatus.SCHEDULED)).isTrue();
        assertThat(posts.saveIfStatus(post, SocialPostStatus.SCHEDULED)).as("a second outcome finds it published").isFalse();
        SocialPost published = posts.findById(post.id()).orElseThrow();
        assertThat(published.status()).isEqualTo(SocialPostStatus.PUBLISHED);
        assertThat(published.publishing().finishedAt()).isEqualTo(NOW.plusSeconds(30));
    }

    @Test
    void aRescheduleIsWrittenOnlyOverTheStatusAndSlotItReadAndAStartReadBeforeItLoses() {
        Instant slot = NOW.plus(1, ChronoUnit.HOURS);
        Instant tomorrow = NOW.plus(1, ChronoUnit.DAYS);
        SocialPost post = approved(slot);
        SocialPost sweepCopy = posts.findById(post.id()).orElseThrow();
        SocialPost staleCopy = posts.findById(post.id()).orElseThrow();

        post.reschedule(tomorrow, NOW);
        assertThat(posts.saveScheduleIfUnchanged(post, SocialPostStatus.APPROVED, slot)).isTrue();
        SocialPost moved = posts.findById(post.id()).orElseThrow();
        assertThat(moved.scheduledFor()).isEqualTo(tomorrow);
        assertThat(moved.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(moved.updatedAt()).isEqualTo(NOW);

        sweepCopy.startPublishing(NOW);
        assertThat(posts.saveIfStatus(sweepCopy, SocialPostStatus.APPROVED)).as("the start read the old slot").isFalse();
        posts.save(staleCopy);
        assertThat(posts.findById(post.id()).orElseThrow()).as("a stale save never moves the post back")
                .extracting(SocialPost::scheduledFor, SocialPost::status).containsExactly(tomorrow, SocialPostStatus.APPROVED);

        staleCopy.reschedule(NOW.plus(2, ChronoUnit.DAYS), NOW);
        assertThat(posts.saveScheduleIfUnchanged(staleCopy, SocialPostStatus.APPROVED, slot)).as("the slot moved meanwhile").isFalse();
        assertThat(posts.saveScheduleIfUnchanged(post, SocialPostStatus.PENDING_APPROVAL, tomorrow)).as("another status").isFalse();
        assertThat(posts.findById(post.id()).orElseThrow().scheduledFor()).isEqualTo(tomorrow);
    }

    @Test
    void aRescheduleAfterPublishingStartedWritesNothing() {
        Instant slot = NOW.minusSeconds(60);
        SocialPost post = approved(slot);
        SocialPost adminCopy = posts.findById(post.id()).orElseThrow();
        post.startPublishing(NOW);
        assertThat(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).isTrue();

        adminCopy.reschedule(NOW.plus(1, ChronoUnit.DAYS), NOW);

        assertThat(posts.saveScheduleIfUnchanged(adminCopy, SocialPostStatus.APPROVED, slot)).isFalse();
        assertThat(posts.findById(post.id()).orElseThrow()).extracting(SocialPost::scheduledFor, SocialPost::status)
                .containsExactly(slot, SocialPostStatus.SCHEDULED);
    }

    @Test
    void publishingNowMovesThePostToNowAndStartsEveryNetworkWithoutWaiting() {
        Instant slot = NOW.plus(3, ChronoUnit.HOURS);
        SocialPost post = approved(slot);
        SocialPost sweepCopy = posts.findById(post.id()).orElseThrow();
        SocialPublishQueue queue = mock(SocialPublishQueue.class);
        PublishingSettings settings = new PublishingSettings(true, EnumSet.of(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK),
                Duration.ofHours(6), ZoneId.of("America/Argentina/Buenos_Aires"), Map.of(SocialNetwork.TIKTOK, LocalTime.of(23, 59)));
        SocialPublishingStarter starter = new SocialPublishingStarter(posts, publications, queue, mock(SocialPublishingNotices.class),
                settings);

        post.publishNow(NOW);
        assertThat(posts.saveScheduleIfUnchanged(post, SocialPostStatus.APPROVED, slot)).isTrue();
        assertThat(starter.startNow(post, NOW)).isEqualTo(SocialPublishingStarter.Result.STARTED);

        SocialPost started = posts.findById(post.id()).orElseThrow();
        assertThat(started.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(started.scheduledFor()).isEqualTo(NOW);
        assertThat(started.publishing().startedAt()).isEqualTo(NOW);
        List<SocialPublication> queued = publications.findByPost(post.id());
        assertThat(queued).extracting(SocialPublication::network).containsExactlyInAnyOrder(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK);
        queued.forEach(publication -> verify(queue).enqueue(publication.id(), Duration.ZERO));
        sweepCopy.startPublishing(NOW);
        assertThat(posts.saveIfStatus(sweepCopy, SocialPostStatus.APPROVED)).as("the sweep finds it started").isFalse();
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
