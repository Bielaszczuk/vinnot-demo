package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.infrastructure.effects.OutboxSocialMediaRenderQueue;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
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

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * S6 (V80): the media column round-trips, belongs to the render job, and tells storage cleanup which keys are in use.
 * #497 S8: each language keeps its own target and slides through every save.
 */
@Testcontainers(disabledWithoutDocker = true)
class JdbcSocialPostMediaPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z").truncatedTo(ChronoUnit.SECONDS);
    private static final Instant TUESDAY = Instant.parse("2026-11-03T22:00:00Z");
    private static final Instant SATURDAY = Instant.parse("2026-11-07T22:00:00Z");
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Suave", "Taninos redondos."),
            new PostCopy.Slide("Origen", "Burdeos."), new PostCopy.Slide("Hoy", "Brinda."));
    private static final List<String> TAGS = List.of("#vinnot", "#merlot", "#vino", "#tinto", "#copa");
    private static final PostCopy SPANISH = PostCopy.of(PostLanguage.ES, "Merlot, el tinto amable", SLIDES, "Hoy es el día del Merlot.",
            TAGS, "Copa de vino tinto", "¿Cuál fue tu primer Merlot?");
    private static final PostCopy ENGLISH = PostCopy.of(PostLanguage.EN, "Merlot, the gentle red", SLIDES, "Today is Merlot day.", TAGS,
            "A glass of red wine", "What was your first Merlot?");
    private static final PostCopies COPY = new PostCopies(SPANISH, ENGLISH);
    private static final GenerationInfo GENERATED = GenerationInfo.none().succeeded("mock", "x", true, FactCheck.SKIPPED, List.of(), NOW);
    private static JdbcTemplate jdbc;
    private static JdbcSocialPostRepository posts;
    private static JdbcSocialMediaReferences references;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        posts = new JdbcSocialPostRepository(jdbc, new ObjectMapper());
        references = new JdbcSocialMediaReferences(jdbc);
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM social_posts");
        jdbc.update("DELETE FROM external_effects");
        jdbc.update("DELETE FROM users");
    }

    @Test
    void theMediaAndTheIllustrationSubjectRoundTrip() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SATURDAY, "WINE_DAY", "MERLOT", NOW);
        post.copyGenerated(COPY.withIllustration("a bunch of Merlot grapes"), GENERATED, NOW);
        posts.save(post);
        SocialPostMedia pending = post.media();
        SocialPostMedia ready = rendered(post, pending);

        assertThat(posts.saveMedia(post.id(), pending, ready)).isTrue();

        SocialPost stored = posts.findById(post.id()).orElseThrow();
        assertThat(stored.copies().illustration()).isEqualTo("a bunch of Merlot grapes");
        assertThat(stored.media()).isEqualTo(ready);
        SocialPostMedia fallback = ready.newIllustration(NOW).withIllustration(SocialPostMedia.Illustration.fallback(2, "grapes",
                "AI_IMAGE_REJECTED"), NOW).failed("TEXT_DOES_NOT_FIT", NOW);
        assertThat(posts.saveMedia(post.id(), ready, fallback)).isTrue();
        assertThat(posts.findById(post.id()).orElseThrow().media()).isEqualTo(fallback);
    }

    @Test
    void rowsStoredBeforeTheMediaColumnStillLoad() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO social_posts (id, status, scheduled_for, pillar_code, copy, generation, created_at, updated_at)
                VALUES (?, 'PENDING_APPROVAL', ?, 'CURIOUS_FACT', CAST(? AS jsonb), CAST('{"attempts": 1}' AS jsonb), ?, ?)
                """, id, Timestamp.from(TUESDAY), """
                {"es": {"hook": "Hola", "slides": [{"title": "Uno", "body": "a"}, {"title": "Dos", "body": "b"}, {"title": "Tres", "body": "c"}],
                 "caption": "Texto", "hashtags": ["#vinnot", "#a", "#b", "#c", "#d"], "altText": "Alt", "cta": "¿Y tú?"}}
                """, Timestamp.from(NOW), Timestamp.from(NOW));

        SocialPost legacy = posts.findById(id).orElseThrow();

        assertThat(legacy.media()).isNull();
        assertThat(legacy.copies().illustration()).isNull();
        assertThat(legacy.copies().es().hook()).isEqualTo("Hola");
        assertThat(legacy.copies().en()).isNull();
        assertThat(posts.findAwaitingMedia(NOW, 10)).extracting(SocialPost::id).containsExactly(id);
        legacy.prepareMedia(NOW);
        assertThat(posts.saveMedia(id, null, legacy.media())).isTrue();
        assertThat(posts.findById(id).orElseThrow().media()).isEqualTo(legacy.media());
    }

    @Test
    void savingThePostKeepsTheRenderJobsMediaUntilItTargetsOtherCopy() {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SATURDAY, "WINE_DAY", "MERLOT", NOW);
        post.copyGenerated(COPY, GENERATED, NOW);
        posts.save(post);
        SocialPostMedia ready = rendered(post, post.media());
        assertThat(posts.saveMedia(post.id(), post.media(), ready)).isTrue();

        post.approve(user(), NOW);
        posts.save(post);
        assertThat(posts.findById(post.id()).orElseThrow().media()).as("a stale snapshot never overwrites the job's media").isEqualTo(ready);
        assertThat(posts.saveMedia(post.id(), post.media(), ready)).as("compare-and-set against a stale document fails").isFalse();

        post.requestNewIllustration(NOW);
        posts.save(post);
        SocialPostMedia renewed = posts.findById(post.id()).orElseThrow().media();
        assertThat(renewed.illustrationVersion()).isEqualTo(2);
        assertThat(renewed.status()).isEqualTo(SocialPostMedia.Status.PENDING);

        post.edit(PostLanguage.ES, PostCopy.of(PostLanguage.ES, "Otro hook", SLIDES, "Texto", TAGS, "Alt", "¿Y tú?"), user(), NOW);
        posts.save(post);
        assertThat(posts.findById(post.id()).orElseThrow().media().copyHashes()).isEqualTo(post.copies().mediaHashes());
        assertThat(posts.saveMedia(UUID.randomUUID(), null, ready)).isFalse();
    }

    @Test
    void anEditSnapshotTakenBeforeTheRendersLastWriteKeepsTheNewSlides() {
        SocialPost post = withCopy(SATURDAY, "WINE_DAY");
        SocialPostMedia painted = post.media().attempted(NOW).withIllustration(SocialPostMedia.Illustration.ai(1, "grapes",
                image(post, "hero-aaaa.png")), NOW);
        assertThat(posts.saveMedia(post.id(), post.media(), painted)).isTrue();
        SocialPost editor = posts.findById(post.id()).orElseThrow();
        SocialPostMedia ready = painted.rendered(both(post, "new"), NOW.plusSeconds(30));
        assertThat(posts.saveMedia(post.id(), painted, ready)).isTrue();

        editor.edit(PostLanguage.ES, PostCopy.of(PostLanguage.ES, "Otro hook", SLIDES, "Texto", TAGS, "Alt", "¿Y tú?"), user(),
                NOW.plusSeconds(60));
        posts.save(editor);

        SocialPostMedia stored = posts.findById(post.id()).orElseThrow().media();
        assertThat(stored.copyHashes()).isEqualTo(editor.copies().mediaHashes());
        assertThat(stored.staleLanguages()).as("only the edited language waits for a render").containsExactly(PostLanguage.ES);
        assertThat(stored.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(stored.attempts()).isZero();
        assertThat(stored.illustrationVersion()).isEqualTo(1);
        assertThat(stored.illustration()).isEqualTo(ready.illustration());
        assertThat(stored.slides()).as("the slides the render just stored stay until the new copy is rendered").isEqualTo(ready.slides());
    }

    @Test
    void aStaleSnapshotNeverRevertsANewerIllustration() {
        SocialPost post = withCopy(SATURDAY, "WINE_DAY");
        SocialPostMedia first = rendered(post, post.media());
        assertThat(posts.saveMedia(post.id(), post.media(), first)).isTrue();
        SocialPost regenerating = posts.findById(post.id()).orElseThrow();
        SocialPost reviewer = posts.findById(post.id()).orElseThrow();
        SocialPost admin = posts.findById(post.id()).orElseThrow();
        admin.requestNewIllustration(NOW.plusSeconds(10));
        posts.save(admin);
        SocialPostMedia requested = posts.findById(post.id()).orElseThrow().media();
        SocialPostMedia second = requested.attempted(NOW).withIllustration(SocialPostMedia.Illustration.ai(2, "grapes",
                image(post, "hero-i2.png")), NOW).rendered(both(post, "i2"), NOW.plusSeconds(40));
        assertThat(posts.saveMedia(post.id(), requested, second)).isTrue();

        reviewer.approve(user(), NOW.plusSeconds(50));
        posts.save(reviewer);
        assertThat(posts.findById(post.id()).orElseThrow().media()).as("same copy, older version: nothing changes").isEqualTo(second);

        regenerating.copyGenerated(COPY.with(PostLanguage.ES, PostCopy.of(PostLanguage.ES, "Hook nuevo", SLIDES, "Texto", TAGS, "Alt",
                "¿Y tú?")), GENERATED, NOW.plusSeconds(60));
        posts.save(regenerating);

        SocialPostMedia stored = posts.findById(post.id()).orElseThrow().media();
        assertThat(stored.copyHashes()).isEqualTo(regenerating.copies().mediaHashes());
        assertThat(stored.illustrationVersion()).as("the version never goes back").isEqualTo(2);
        assertThat(stored.illustration()).as("the paid hero of version 2 is kept").isEqualTo(second.illustration());
        assertThat(stored.slides()).isEqualTo(second.slides());
        assertThat(stored.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(references.isReferenced("posts/" + post.id() + "/hero-i2.png")).isTrue();
        assertThat(references.isReferenced("posts/" + post.id() + "/hero-aaaa.png")).isFalse();

        SocialPost back = posts.findById(post.id()).orElseThrow();
        back.edit(PostLanguage.ES, SPANISH, user(), NOW.plusSeconds(70));
        posts.save(back);
        SocialPostMedia restored = posts.findById(post.id()).orElseThrow().media();
        assertThat(restored.status()).as("the stored slides show this copy and version again").isEqualTo(SocialPostMedia.Status.READY);
        assertThat(restored.slides()).isEqualTo(second.slides());
    }

    @Test
    void onlyUpcomingPostsWithCopyWhoseMediaWaitsAreSwept() {
        SocialPost waiting = withCopy(TUESDAY, "CURIOUS_FACT");
        SocialPost done = withCopy(SATURDAY, "QUIZ");
        assertThat(posts.saveMedia(done.id(), done.media(), rendered(done, done.media()))).isTrue();
        SocialPost past = withCopy(NOW.minusSeconds(86_400), "EDUCATION");
        SocialPost rejected = withCopy(SATURDAY.plusSeconds(86_400), "PAIRING");
        rejected.reject(user(), null, NOW);
        posts.save(rejected);
        posts.save(SocialPost.planned(UUID.randomUUID(), SATURDAY.plusSeconds(172_800), "HUMOR", null, NOW));

        assertThat(posts.findAwaitingMedia(NOW, 10)).extracting(SocialPost::id).containsExactly(waiting.id());
        assertThat(past.id()).isNotNull();
    }

    @Test
    void cleanupKeepsKeysAnyPostReferencesOrAQueuedRenderMayReuse() {
        SocialPost post = withCopy(SATURDAY, "CURIOUS_FACT");
        SocialPostMedia ready = rendered(post, post.media());
        posts.saveMedia(post.id(), post.media(), ready);
        String prefix = "posts/" + post.id() + "/";

        assertThat(references.isReferenced(prefix + "hero-aaaa.png")).isTrue();
        assertThat(references.isReferenced(prefix + "es/instagram-02-bbbb.jpg")).isTrue();
        assertThat(references.isReferenced(prefix + "es/tiktok-01-cccc.jpg")).isTrue();
        assertThat(references.isReferenced(prefix + "en/instagram-01-dddd.jpg")).as("English slides are referenced too").isTrue();
        assertThat(references.isReferenced(prefix + "en/tiktok-01-eeee.jpg")).isTrue();
        assertThat(references.isReferenced(prefix + "es/instagram-01-old.jpg")).isFalse();
        assertThat(references.isReferenced("other/key.png")).isFalse();

        new OutboxSocialMediaRenderQueue(new DurableEffectQueue(jdbc, new ObjectMapper()))
                .request(post.id(), "hash", 2);
        assertThat(references.isReferenced(prefix + "es/instagram-01-old.jpg")).as("a queued render of the post may store it again").isTrue();
        assertThat(references.isReferenced("posts/" + UUID.randomUUID() + "/hero-aaaa.png")).isFalse();
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users (id, email, username, password, first_name, last_name, preferred_language, email_verified)
                VALUES (?, ?, ?, 'hash', 'A', 'B', 'es', true)
                """, id, "owner-" + id + "@vinnot.test", "owner-" + id);
        return id;
    }

    private static SocialPost withCopy(Instant slot, String pillar) {
        SocialPost post = SocialPost.planned(UUID.randomUUID(), slot, pillar, null, NOW);
        post.copyGenerated(COPY, GENERATED, NOW);
        posts.save(post);
        return post;
    }

    private static SocialPostMedia.Image image(SocialPost post, String file) {
        String key = "posts/" + post.id() + "/" + file;
        return new SocialPostMedia.Image(key, "https://cdn/" + key);
    }

    private static SocialPostMedia rendered(SocialPost post, SocialPostMedia media) {
        String prefix = "posts/" + post.id() + "/";
        return media.attempted(NOW).withIllustration(SocialPostMedia.Illustration.ai(media.illustrationVersion(), "grapes",
                new SocialPostMedia.Image(prefix + "hero-aaaa.png", "https://cdn/" + prefix + "hero-aaaa.png")), NOW)
                .rendered(Map.of(PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(
                                new SocialPostMedia.Image(prefix + "es/instagram-01-aaaa.jpg", "https://cdn/ig-1.jpg"),
                                new SocialPostMedia.Image(prefix + "es/instagram-02-bbbb.jpg", "https://cdn/ig-2.jpg")),
                                List.of(new SocialPostMedia.Image(prefix + "es/tiktok-01-cccc.jpg", "https://cdn/tt-1.jpg"))),
                        PostLanguage.EN, new SocialPostMedia.SlideImages(
                                List.of(new SocialPostMedia.Image(prefix + "en/instagram-01-dddd.jpg", "https://cdn/ig-en.jpg")),
                                List.of(new SocialPostMedia.Image(prefix + "en/tiktok-01-eeee.jpg", "https://cdn/tt-en.jpg")))),
                        NOW.plusSeconds(30));
    }

    private static Map<PostLanguage, SocialPostMedia.SlideImages> both(SocialPost post, String tag) {
        return Map.of(PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(image(post, "es/instagram-01-" + tag + ".jpg")),
                        List.of(image(post, "es/tiktok-01-" + tag + ".jpg"))),
                PostLanguage.EN, new SocialPostMedia.SlideImages(List.of(image(post, "en/instagram-01-" + tag + ".jpg")),
                        List.of(image(post, "en/tiktok-01-" + tag + ".jpg"))));
    }
}
