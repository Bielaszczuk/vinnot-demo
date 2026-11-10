package com.vinnot.shared.infrastructure.persistence;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DatabaseIndexContractPostgresIntegrationTest {

    private static final UUID ARGENTINA_ID =
            UUID.fromString("d31dc4d8-0ca2-4589-9830-5407cb9859c6");
    private static final UUID MENDOZA_ID =
            UUID.fromString("203fe15e-6984-47f6-9f6c-d909b4acecfd");

    @Container
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18-alpine");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void indexesEveryForeignKeyAtItsLeadingColumn() {
        List<String> uncovered = jdbcTemplate.queryForList("""
                SELECT constraint_data.table_name || '.' || constraint_data.constraint_name
                FROM (
                    SELECT constraint_row.conrelid,
                           constraint_row.conname AS constraint_name,
                           constraint_row.conrelid::regclass::text AS table_name,
                           constraint_row.conkey[1] AS first_column
                    FROM pg_constraint constraint_row
                    WHERE constraint_row.contype = 'f'
                      AND constraint_row.connamespace = 'public'::regnamespace
                ) constraint_data
                WHERE NOT EXISTS (
                    SELECT 1 FROM pg_index index_row
                    WHERE index_row.indrelid = constraint_data.conrelid
                      AND index_row.indisvalid
                      AND index_row.indisready
                      AND index_row.indkey[0] = constraint_data.first_column
                )
                ORDER BY constraint_data.table_name, constraint_data.constraint_name
                """, String.class);

        assertThat(uncovered).isEmpty();
    }

    @Test
    void doesNotKeepEquivalentStandaloneIndexes() {
        List<String> duplicates = jdbcTemplate.queryForList("""
                SELECT table_row.relname || ': ' || first_index.relname
                       || ' = ' || second_index.relname
                FROM pg_index first_definition
                JOIN pg_class first_index
                  ON first_index.oid = first_definition.indexrelid
                JOIN pg_index second_definition
                  ON second_definition.indrelid = first_definition.indrelid
                 AND second_definition.indexrelid > first_definition.indexrelid
                JOIN pg_class second_index
                  ON second_index.oid = second_definition.indexrelid
                JOIN pg_class table_row
                  ON table_row.oid = first_definition.indrelid
                WHERE table_row.relnamespace = 'public'::regnamespace
                  AND first_definition.indisvalid
                  AND second_definition.indisvalid
                  AND first_definition.indkey = second_definition.indkey
                  AND first_definition.indcollation = second_definition.indcollation
                  AND first_definition.indclass = second_definition.indclass
                  AND first_definition.indoption = second_definition.indoption
                  AND first_definition.indnkeyatts = second_definition.indnkeyatts
                  AND COALESCE(pg_get_expr(first_definition.indexprs,
                                           first_definition.indrelid), '')
                      = COALESCE(pg_get_expr(second_definition.indexprs,
                                            second_definition.indrelid), '')
                  AND COALESCE(pg_get_expr(first_definition.indpred,
                                           first_definition.indrelid), '')
                      = COALESCE(pg_get_expr(second_definition.indpred,
                                            second_definition.indrelid), '')
                ORDER BY table_row.relname, first_index.relname
                """, String.class);

        assertThat(duplicates).isEmpty();
    }

    @Test
    void exposesOnlyTheCurrentCatalogSearchReadModel() {
        assertThat(indexNames("wines"))
                .contains(
                        "idx_wines_active_country_region_type_name_page",
                        "idx_wines_active_name_page",
                        "idx_wines_active_winery_name")
                .doesNotContain(
                        "idx_wines_search_vector",
                        "idx_wines_name_trgm",
                        "idx_wines_active_country_region_type_name");
        assertThat(indexNames("wine_catalog_search"))
                .contains(
                        "idx_wine_catalog_search_text",
                        "idx_wine_catalog_search_vector");
        assertThat(indexNames("wineries"))
                .contains(
                        "idx_wineries_active_name_search",
                        "idx_wineries_active_name_trgm");
        assertThat(indexDefinition("idx_wineries_active_name_trgm"))
                .contains("USING gin (name gin_trgm_ops)")
                .contains("WHERE (is_active = true)");
    }

    @Test
    void plannerCanUseTheCatalogAndFilterIndexes() {
        jdbcTemplate.execute("SET LOCAL enable_seqscan = off");

        String filterPlan = explain("""
                SELECT wine.id, wine.name
                FROM wines wine
                WHERE wine.is_active = true
                  AND wine.country_id = '%s'
                  AND wine.region_id = '%s'
                  AND wine.wine_type = 'RED'
                ORDER BY wine.name
                LIMIT 20
                """.formatted(ARGENTINA_ID, MENDOZA_ID));
        String catalogPlan = explain("""
                SELECT catalog.wine_id
                FROM wine_catalog_search catalog
                WHERE catalog.search_vector @@ to_tsquery('simple', 'black:* & tears:*')
                """);
        String containsPlan = explain("""
                SELECT catalog.wine_id
                FROM wine_catalog_search catalog
                WHERE catalog.search_text LIKE '%piz%'
                """);
        assertThat(filterPlan)
                .contains("idx_wines_active_country_region_type_name_page");
        assertThat(catalogPlan).contains("idx_wine_catalog_search_vector");
        assertThat(containsPlan).contains("idx_wine_catalog_search_text");
    }

    @Test
    void keepsCatalogSearchSynchronizedAfterIdentityChanges() {
        UUID wineryId = UUID.randomUUID();
        UUID wineId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO wineries (id, name) VALUES (?, ?)",
                wineryId, "Audit Winery");
        jdbcTemplate.update(
                "INSERT INTO wines (id, winery_id, name, wine_type) VALUES (?, ?, ?, ?)",
                wineId, wineryId, "Audit Wine", "RED");

        assertThat(matchesCatalog(wineId, "audit & wine & winery")).isTrue();

        jdbcTemplate.update(
                "UPDATE wines SET name = ? WHERE id = ?", "Renamed Bottle", wineId);
        jdbcTemplate.update(
                "UPDATE wineries SET name = ? WHERE id = ?", "Renamed Estate", wineryId);

        assertThat(matchesCatalog(wineId, "renamed & bottle & estate")).isTrue();
        assertThat(containsCatalog(wineId, "%named%state%")).isTrue();
        assertThat(matchesCatalog(wineId, "audit & wine")).isFalse();
        assertThat(containsCatalog(wineId, "%audit%")).isFalse();
    }

    private List<String> indexNames(String tableName) {
        return jdbcTemplate.queryForList("""
                SELECT indexname FROM pg_indexes
                WHERE schemaname = 'public' AND tablename = ?
                ORDER BY indexname
                """, String.class, tableName);
    }

    private String explain(String sql) {
        return String.join("\n", jdbcTemplate.queryForList(
                "EXPLAIN " + sql, String.class));
    }

    private String indexDefinition(String indexName) {
        return jdbcTemplate.queryForObject(
                "SELECT pg_get_indexdef(?::regclass)",
                String.class,
                indexName);
    }

    private boolean matchesCatalog(UUID wineId, String query) {
        Boolean matches = jdbcTemplate.queryForObject("""
                SELECT search_vector @@ to_tsquery('simple', ?)
                FROM wine_catalog_search WHERE wine_id = ?
                """, Boolean.class, query, wineId);
        return Boolean.TRUE.equals(matches);
    }

    private boolean containsCatalog(UUID wineId, String pattern) {
        Boolean matches = jdbcTemplate.queryForObject("""
                SELECT search_text LIKE ?
                FROM wine_catalog_search WHERE wine_id = ?
                """, Boolean.class, pattern, wineId);
        return Boolean.TRUE.equals(matches);
    }
}
