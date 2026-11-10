package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.ContentPillar;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * S13 (V84, #510): six deeper pillars join the rotation with briefs in both languages, QUIZ becomes connoisseur level,
 * HUMOR stops rotating, and the Argentine wine days stay as they were.
 */
@Testcontainers(disabledWithoutDocker = true)
class SocialContentRefinementMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final List<String> NEW_PILLARS = List.of("TERROIR", "WINEMAKING", "HISTORY", "REGION", "TASTING", "SERVICE");
    private static final List<String> STREET_FOOD = List.of("empanada", "pizza", "choripán", "asado", "alfajor", "hamburguesa");

    private static JdbcTemplate jdbc;
    private static JdbcContentPillarCatalog pillars;
    private static long argentineDaysBefore;

    @BeforeAll
    static void migrateFromV83() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("83").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        argentineDaysBefore = jdbc.queryForObject("SELECT count(*) FROM wine_days WHERE country_code = 'AR'", Long.class);
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("84").load().migrate();
        pillars = new JdbcContentPillarCatalog(jdbc);
    }

    @Test
    void sixDeeperPillarsJoinTheRotationWithBriefsInBothLanguages() {
        Map<String, ContentPillar> byCode = pillars.all().stream().collect(Collectors.toMap(ContentPillar::code, pillar -> pillar));

        assertThat(byCode).containsKeys(NEW_PILLARS.toArray(String[]::new));
        for (String code : NEW_PILLARS) {
            ContentPillar pillar = byCode.get(code);
            assertThat(pillar.active()).as(code).isTrue();
            assertThat(pillar.autoApprove()).as(code).isFalse();
            assertThat(pillar.rotates()).as(code).isTrue();
            assertThat(pillar.brief()).as(code).hasSizeGreaterThan(200);
            assertThat(pillar.briefEn()).as(code).hasSizeGreaterThan(200);
            for (String food : STREET_FOOD) {
                assertThat(pillar.brief().toLowerCase()).as(code).doesNotContain(food);
            }
        }
        assertThat(byCode.get("TERROIR").brief()).contains("pizarra", "caliza");
        assertThat(byCode.get("HISTORY").briefEn()).contains("1855", "Judgement of Paris");
        assertThat(pillars.all()).extracting(ContentPillar::sortOrder).doesNotHaveDuplicates();
    }

    @Test
    void humorStopsRotatingAndTheQuizAsksForConnoisseurKnowledge() {
        Map<String, ContentPillar> byCode = pillars.all().stream().collect(Collectors.toMap(ContentPillar::code, pillar -> pillar));

        assertThat(byCode.get("HUMOR").active()).isFalse();
        assertThat(byCode.values()).filteredOn(pillar -> !"HUMOR".equals(pillar.code())).allMatch(ContentPillar::active);
        assertThat(byCode.get("QUIZ").brief()).contains("conocedor", "cultura general");
        assertThat(byCode.get("QUIZ").briefEn()).contains("connoisseur");
        assertThat(byCode.get("CURIOUS_FACT").briefEn()).contains("does not know yet");
    }

    @Test
    void theArgentineWineDaysStay() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM wine_days WHERE country_code = 'AR'", Long.class)).isEqualTo(argentineDaysBefore)
                .isGreaterThanOrEqualTo(6);
        assertThat(jdbc.queryForObject("SELECT priority FROM wine_days WHERE code = 'MALBEC'", Integer.class)).isEqualTo(1);
    }
}
