package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #497 S6 and S10: V81 rewrites the pillar briefs in the new voice with an English brief, and moves every stored copy and
 * media document into the per-language shape (the old copy and slides under {@code es}) without losing anything.
 */
@Testcontainers(disabledWithoutDocker = true)
class SocialBilingualMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    static final String OLD_COPY = """
            {"hook": "Merlot, el tinto amable", "slides": [{"title": "Suave", "body": "Taninos redondos."},
             {"title": "Origen", "body": "Burdeos."}, {"title": "Hoy", "body": "Brindá."}],
             "caption": "Hoy es el día del Merlot.\\n\\nBeber con moderación. Prohibida su venta a menores de 18 años.",
             "hashtags": ["#vinnot", "#merlot", "#vino", "#tinto", "#copa"], "altText": "Copa de vino tinto",
             "cta": "¿Cuál fue tu primer Merlot?", "illustration": "a bunch of Merlot grapes"}
            """;
    static final String READY_MEDIA = """
            {"status": "READY", "copyHash": "hash-es", "illustrationVersion": 2, "attempts": 1, "error": null,
             "updatedAt": "2026-11-02T12:00:30Z",
             "illustration": {"version": 2, "subject": "a bunch of Merlot grapes", "source": "AI",
              "image": {"key": "posts/p/hero-aaaa.png", "url": "https://cdn/hero-aaaa.png"}, "reason": null},
             "slides": {"copyHash": "hash-es", "illustrationVersion": 2,
              "instagram": [{"key": "posts/p/instagram-01-aaaa.jpg", "url": "https://cdn/ig-1.jpg"}],
              "tiktok": [{"key": "posts/p/tiktok-01-bbbb.jpg", "url": "https://cdn/tt-1.jpg"}],
              "renderedAt": "2026-11-02T12:00:30Z"}}
            """;
    static final String WAITING_MEDIA = """
            {"status": "PENDING", "copyHash": "hash-new", "illustrationVersion": 1, "attempts": 0, "error": null,
             "updatedAt": "2026-11-02T12:00:00Z", "illustration": null, "slides": null}
            """;
    static final List<String> STREET_FOOD = List.of("empanada", "pizza", "choripán", "milanesa", "alfajor", "helado", "hamburgues");
    static final List<String> VOSEO = List.of("Celebrá", "Contá", "Terminá", "Mostrá", "Presentá", "Invitá", "anti snob", " vos ");
    static final UUID READY = UUID.randomUUID();
    static final UUID WAITING = UUID.randomUUID();
    static final UUID LEGACY = UUID.randomUUID();
    static final UUID DRAFT = UUID.randomUUID();
    /** Its own approved legacy row, so the regeneration test does not change the rows the other tests read. */
    static final UUID REGENERATE = UUID.randomUUID();
    /** V84 rewrites the QUIZ and CURIOUS_FACT briefs, so re-running V81 on top of it would rightly restore the V81 text. */
    static final String PILLARS_V81_OWNS =
            "SELECT code, brief, brief_en FROM content_pillars WHERE code NOT IN ('QUIZ', 'CURIOUS_FACT') ORDER BY code";
    static JdbcTemplate jdbc;
    static DriverManagerDataSource dataSource;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeAll
    static void migrateWithRowsStoredBeforeV81() {
        dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("80").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        insert(READY, "PENDING_APPROVAL", NOW.plusSeconds(86_400), OLD_COPY, READY_MEDIA);
        insert(WAITING, "DRAFT", NOW.plusSeconds(2 * 86_400), null, null);
        insert(LEGACY, "APPROVED", NOW.plusSeconds(3 * 86_400), OLD_COPY, null);
        insert(DRAFT, "PENDING_APPROVAL", NOW.plusSeconds(4 * 86_400), OLD_COPY, WAITING_MEDIA);
        insert(REGENERATE, "APPROVED", NOW.plusSeconds(5 * 86_400), OLD_COPY, null);
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
    }

    @Test
    void theOldCopyMovesUnderSpanishUntouchedAndPostsWithoutCopyKeepNone() {
        assertThat(json(READY, "copy").properties()).extracting(Map.Entry::getKey).containsExactly("es");
        assertThat(json(READY, "copy").get("es")).isEqualTo(mapper.readTree(OLD_COPY));
        assertThat(json(LEGACY, "copy").get("es")).isEqualTo(mapper.readTree(OLD_COPY));
        assertThat(jdbc.queryForObject("SELECT copy IS NULL AND media IS NULL FROM social_posts WHERE id = ?", Boolean.class, WAITING))
                .isTrue();
        assertThat(jdbc.queryForObject("SELECT media IS NULL FROM social_posts WHERE id = ?", Boolean.class, LEGACY)).isTrue();
    }

    @Test
    void theMediaTargetsAndSlidesMoveUnderSpanishAndEverythingElseStays() {
        JsonNode before = mapper.readTree(READY_MEDIA);
        JsonNode media = json(READY, "media");
        assertThat(media.has("copyHash")).isFalse();
        assertThat(media.get("copyHashes")).isEqualTo(mapper.readTree("{\"es\": \"hash-es\"}"));
        assertThat(media.get("slides")).isEqualTo(mapper.createObjectNode().set("es", before.get("slides")));
        for (String field : List.of("status", "illustrationVersion", "attempts", "error", "updatedAt", "illustration")) {
            assertThat(media.get(field)).as(field).isEqualTo(before.get(field));
        }

        JsonNode waiting = json(DRAFT, "media");
        assertThat(waiting.get("copyHashes")).isEqualTo(mapper.readTree("{\"es\": \"hash-new\"}"));
        assertThat(waiting.get("slides")).isEqualTo(mapper.createObjectNode());
        assertThat(waiting.get("status").asString()).isEqualTo("PENDING");
    }

    @Test
    void everyPillarBriefIsRewrittenInTheNewVoiceAndGainsAnEnglishBrief() {
        List<Map<String, Object>> pillars = jdbc.queryForList("SELECT code, brief, brief_en FROM content_pillars ORDER BY sort_order");
        assertThat(pillars).hasSizeGreaterThanOrEqualTo(9).allSatisfy(pillar -> {
            String brief = (String) pillar.get("brief");
            String english = (String) pillar.get("brief_en");
            assertThat(english).as("brief_en of %s", pillar.get("code")).isNotBlank();
            for (String food : STREET_FOOD) {
                assertThat(brief.toLowerCase()).as("brief of %s", pillar.get("code")).doesNotContain(food);
            }
            for (String regional : VOSEO) {
                assertThat(brief).as("brief of %s", pillar.get("code")).doesNotContain(regional);
            }
            assertThat(english.toLowerCase()).doesNotContain("empanada", "pizza", "choripán", "alfajor", "ice cream", "burger");
        });
        Map<String, Object> pairing = pillars.stream().filter(pillar -> "PAIRING".equals(pillar.get("code"))).findFirst().orElseThrow();
        assertThat((String) pairing.get("brief")).contains("quesos de pasta dura y madurados (parmesano, pecorino)",
                "quesos semiduros de tenor graso medio (fontina, gruyère)", "carnes rojas", "carnes blancas", "pescados grasos",
                "hongos y verduras asadas");
        assertThat((String) pairing.get("brief_en")).contains("Parmesan", "Fontina", "red meat", "oily fish");
        assertThat(jdbc.queryForObject("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'content_pillars' "
                + "AND column_name = 'brief_en'", String.class)).isEqualTo("NO");
    }

    @Test
    void migratedPostsLoadWithSpanishOnlyAndARegenerationFillsBothLanguages() {
        JdbcSocialPostRepository posts = new JdbcSocialPostRepository(jdbc, mapper);
        SocialPost ready = posts.findById(READY).orElseThrow();
        assertThat(ready.copies().en()).isNull();
        assertThat(ready.copies().es().hook()).isEqualTo("Merlot, el tinto amable");
        assertThat(ready.copies().es().caption()).endsWith(PostLanguage.ES.legalLine());
        assertThat(ready.copies().illustration()).isEqualTo("a bunch of Merlot grapes");
        assertThat(ready.media().status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(ready.media().currentSlides(PostLanguage.ES)).as("the migrated slides stay current for the migrated Spanish target")
                .isEqualTo(ready.media().slides().get(PostLanguage.ES));
        assertThat(ready.media().slides().get(PostLanguage.ES).instagram()).hasSize(1);
        assertThat(ready.media().keys()).containsExactly("posts/p/hero-aaaa.png", "posts/p/instagram-01-aaaa.jpg",
                "posts/p/tiktok-01-bbbb.jpg");

        SocialPost legacy = posts.findById(REGENERATE).orElseThrow();
        assertThat(legacy.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(legacy.prepareMedia(NOW)).isTrue();
        assertThat(legacy.media().copyHashes()).containsOnlyKeys(PostLanguage.ES);
        assertThat(legacy.media().copyHashes().get(PostLanguage.ES)).as("the old copy keeps its media hash, so old slides stay valid")
                .isEqualTo(legacy.copies().es().mediaHash());

        legacy.requireRegenerable();
        PostCopy english = PostCopy.of(PostLanguage.EN, "Merlot, the gentle red", legacy.copies().es().slides(), "Today is Merlot day.",
                List.of("#vinnot", "#merlot", "#wine", "#redwine", "#glass"), "A glass of red wine", "What was your first Merlot?");
        legacy.copyGenerated(new PostCopies(legacy.copies().es(), english), legacy.generation().succeeded("mock", "x", true,
                FactCheck.SKIPPED, List.of(), NOW), NOW);
        posts.save(legacy);
        SocialPost regenerated = posts.findById(REGENERATE).orElseThrow();
        assertThat(regenerated.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(regenerated.copies().complete()).isTrue();
        assertThat(regenerated.media().copyHashes()).containsOnlyKeys(PostLanguage.ES, PostLanguage.EN);
        assertThat(regenerated.media().staleLanguages()).containsExactly(PostLanguage.ES, PostLanguage.EN);
    }

    @Test
    void runningTheMigrationAgainChangesNothing() throws IOException {
        List<Map<String, Object>> posts = jdbc.queryForList("SELECT id, copy::text, media::text FROM social_posts ORDER BY id");
        List<Map<String, Object>> pillars = jdbc.queryForList(PILLARS_V81_OWNS);

        jdbc.execute(new ClassPathResource("db/migration/V81__social_bilingual_content.sql").getContentAsString(StandardCharsets.UTF_8));

        assertThat(jdbc.queryForList("SELECT id, copy::text, media::text FROM social_posts ORDER BY id")).isEqualTo(posts);
        assertThat(jdbc.queryForList(PILLARS_V81_OWNS)).isEqualTo(pillars);
    }

    private JsonNode json(UUID id, String column) {
        return mapper.readTree(jdbc.queryForObject("SELECT " + column + "::text FROM social_posts WHERE id = ?", String.class, id));
    }

    private static void insert(UUID id, String status, Instant slot, String copy, String media) {
        jdbc.update("""
                INSERT INTO social_posts (id, status, scheduled_for, pillar_code, copy, generation, media, created_at, updated_at)
                VALUES (?, ?, ?, 'CURIOUS_FACT', CAST(? AS jsonb), CAST('{"attempts": 1}' AS jsonb), CAST(? AS jsonb), ?, ?)
                """, id, status, Timestamp.from(slot), copy, media, Timestamp.from(NOW), Timestamp.from(NOW));
    }
}
