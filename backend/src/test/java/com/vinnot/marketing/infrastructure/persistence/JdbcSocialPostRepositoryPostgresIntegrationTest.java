package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostReview;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.marketing.domain.model.WineDayKind;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The V78 seeds and the social_posts table, against the real schema (S1, S2, S5, S7). */
@Testcontainers(disabledWithoutDocker = true)
class JdbcSocialPostRepositoryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z").truncatedTo(ChronoUnit.SECONDS);
    private static final Instant TUESDAY = Instant.parse("2026-11-03T22:00:00Z");
    private static final Instant THURSDAY = Instant.parse("2026-11-05T22:00:00Z");
    private static final Instant SATURDAY = Instant.parse("2026-11-07T22:00:00Z");
    private static final String ADMIN_ROLE = "2f8b336a-a00e-44e8-8c95-673f9013d07d";
    private static final PostCopies COPY = new PostCopies(PostCopy.of(PostLanguage.ES, "Merlot, el tinto amable",
            List.of(new PostCopy.Slide("Suave", "Taninos redondos."), new PostCopy.Slide("Origen", "Burdeos."), new PostCopy.Slide("Hoy", "Brinda.")),
            "Hoy es el día del Merlot.", List.of("#vinnot", "#merlot", "#vino", "#tinto", "#copa"), "Copa de vino tinto",
            "¿Cuál fue tu primer Merlot?"), PostCopy.of(PostLanguage.EN, "Merlot, the gentle red", List.of(new PostCopy.Slide("Smooth",
            "Round tannins."), new PostCopy.Slide("Origin", "Bordeaux."), new PostCopy.Slide("Today", "Cheers.")), "Today is Merlot day.",
            List.of("#vinnot", "#merlot", "#wine", "#redwine", "#glass"), "A glass of red wine", "What was your first Merlot?"));
    private static JdbcTemplate jdbc;
    private static JdbcSocialPostRepository posts;
    private static JdbcWineDayCatalog wineDays;
    private static JdbcContentPillarCatalog pillars;
    private static JdbcMarketingStaff staff;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        posts = new JdbcSocialPostRepository(jdbc, new ObjectMapper());
        wineDays = new JdbcWineDayCatalog(jdbc);
        pillars = new JdbcContentPillarCatalog(jdbc);
        staff = new JdbcMarketingStaff(jdbc);
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM social_posts");
        jdbc.update("DELETE FROM user_roles");
        jdbc.update("DELETE FROM users");
    }

    @Test
    void theSeedHoldsEveryWineDayWithARuleThatResolvesAndThePillarsInRotationOrder() {
        List<WineDay> days = wineDays.all();
        assertThat(days).hasSizeGreaterThanOrEqualTo(75);
        assertThat(days).extracting(WineDay::code).contains("MALBEC", "CHARDONNAY", "CABERNET_SAUVIGNON", "VINO_ARGENTINO", "CHAMPAGNE_NYE");
        assertThat(days).allSatisfy(day -> {
            assertThat(day.on(2026).getYear()).isEqualTo(2026);
            assertThat(day.nameEs()).isNotBlank();
            assertThat(day.nameEn()).isNotBlank();
        });
        WineDay chardonnay = days.stream().filter(day -> day.code().equals("CHARDONNAY")).findFirst().orElseThrow();
        assertThat(chardonnay.on(2026)).isEqualTo(LocalDate.of(2026, 5, 21));
        assertThat(chardonnay.kind()).isEqualTo(WineDayKind.GRAPE);
        assertThat(chardonnay.priority()).isEqualTo(1);
        assertThat(days.stream().filter(day -> day.code().equals("MALBEC")).findFirst().orElseThrow().countryCode()).isEqualTo("AR");

        assertThat(pillars.all()).extracting(ContentPillar::code).containsExactly("WINE_DAY", "CURIOUS_FACT", "EDUCATION",
                "MYTH_VS_REALITY", "QUIZ", "PAIRING", "GRAPE_OF_MONTH", "HUMOR", "APP_FEATURE", "TERROIR", "WINEMAKING", "HISTORY", "REGION",
                "TASTING", "SERVICE");
        assertThat(pillars.all()).allSatisfy(pillar -> {
            assertThat(pillar.brief()).isNotBlank();
            assertThat(pillar.briefEn()).isNotBlank();
        });
    }

    @Test
    void aPostRoundTripsWithItsCopyGenerationAndReviewAndSlotsAreUnique() {
        UUID reviewer = user("owner");
        SocialPost post = SocialPost.planned(UUID.randomUUID(), SATURDAY, "WINE_DAY", "MERLOT", NOW);
        posts.save(post);
        assertThat(posts.findById(post.id())).get().satisfies(stored -> {
            assertThat(stored.status()).isEqualTo(SocialPostStatus.DRAFT);
            assertThat(stored.copies()).isNull();
            assertThat(stored.generation()).isEqualTo(GenerationInfo.none());
            assertThat(stored.review()).isNull();
            assertThat(stored.wineDayCode()).isEqualTo("MERLOT");
        });

        post.generationFailed(GenerationInfo.none().failed("AI_UNAVAILABLE", NOW), NOW);
        posts.save(post);
        assertThat(posts.findById(post.id()).orElseThrow().generation().error()).isEqualTo("AI_UNAVAILABLE");

        GenerationInfo generated = post.generation().succeeded("openai", "gpt-4o-mini", false, FactCheck.FLAGGED, List.of("Una fecha"), NOW);
        post.copyGenerated(COPY, generated, NOW);
        post.approve(reviewer, NOW.plusSeconds(60));
        posts.save(post);
        SocialPost stored = posts.findById(post.id()).orElseThrow();
        assertThat(stored.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(stored.copies()).isEqualTo(COPY);
        assertThat(jdbc.queryForObject("SELECT copy -> 'en' ->> 'hook' FROM social_posts WHERE id = ?", String.class, post.id()))
                .as("one copy document per language").isEqualTo("Merlot, the gentle red");
        assertThat(stored.generation()).isEqualTo(generated);
        assertThat(stored.review()).isEqualTo(new PostReview(reviewer, NOW.plusSeconds(60), null, null));
        assertThat(stored.createdAt()).isEqualTo(NOW);
        assertThat(stored.updatedAt()).isEqualTo(NOW.plusSeconds(60));

        assertThatThrownBy(() -> posts.save(SocialPost.planned(UUID.randomUUID(), SATURDAY, "QUIZ", null, NOW)))
                .isInstanceOf(DuplicateKeyException.class);
        assertThat(posts.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    void postsAreReadByWindowByStatusAndByPage() {
        SocialPost tuesday = SocialPost.planned(UUID.randomUUID(), TUESDAY, "CURIOUS_FACT", null, NOW);
        SocialPost thursday = SocialPost.planned(UUID.randomUUID(), THURSDAY, "EDUCATION", null, NOW);
        SocialPost saturday = SocialPost.planned(UUID.randomUUID(), SATURDAY, "WINE_DAY", "MERLOT", NOW);
        saturday.copyGenerated(COPY, GenerationInfo.none().succeeded("mock", "x", true, FactCheck.SKIPPED, List.of(), NOW), NOW);
        posts.save(saturday);
        posts.save(tuesday);
        posts.save(thursday);

        assertThat(posts.findScheduledBetween(TUESDAY, THURSDAY)).extracting(SocialPost::id).containsExactly(tuesday.id(), thursday.id());
        assertThat(posts.findByStatus(SocialPostStatus.DRAFT, 1)).extracting(SocialPost::id).containsExactly(tuesday.id());
        assertThat(posts.findByStatus(SocialPostStatus.PENDING_APPROVAL, 10)).extracting(SocialPost::id).containsExactly(saturday.id());

        var page = posts.search(null, null, null, 0, 2);
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.totalPages()).isEqualTo(2);
        assertThat(page.content()).extracting(SocialPost::id).containsExactly(tuesday.id(), thursday.id());
        assertThat(posts.search(null, null, null, 1, 2).content()).extracting(SocialPost::id).containsExactly(saturday.id());
        assertThat(posts.search(SocialPostStatus.PENDING_APPROVAL, null, null, 0, 20).content()).extracting(SocialPost::id)
                .containsExactly(saturday.id());
        assertThat(posts.search(SocialPostStatus.DRAFT, THURSDAY, SATURDAY, 0, 20).content()).extracting(SocialPost::id)
                .containsExactly(thursday.id());
    }

    @Test
    void onlyActiveUnlockedAdministratorsReceiveTheBatchNotice() {
        UUID admin = user("admin");
        UUID locked = user("locked");
        UUID member = user("member");
        jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?::uuid)", admin, ADMIN_ROLE);
        jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?::uuid)", locked, ADMIN_ROLE);
        jdbc.update("UPDATE users SET locked = true WHERE id = ?", locked);
        assertThat(member).isNotNull();

        assertThat(staff.admins()).containsExactly(admin);
    }

    @Test
    void theStaffDirectoryNamesReviewersByEmailAndSkipsUnknownIds() {
        UUID ana = user("ana");
        UUID leo = user("leo");

        var emails = staff.emailsOf(List.of(ana, leo, UUID.randomUUID()));

        assertThat(emails).containsOnlyKeys(ana, leo);
        assertThat(emails.get(ana)).isEqualTo("ana-" + ana + "@vinnot.test");
        assertThat(staff.emailsOf(List.of())).isEmpty();
    }

    private static UUID user(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users (id, email, username, password, first_name, last_name, preferred_language, email_verified)
                VALUES (?, ?, ?, 'hash', 'A', 'B', 'es', true)
                """, id, name + "-" + id + "@vinnot.test", name + "-" + id);
        return id;
    }
}
