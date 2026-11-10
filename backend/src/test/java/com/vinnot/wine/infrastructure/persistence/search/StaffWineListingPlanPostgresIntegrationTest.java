package com.vinnot.wine.infrastructure.persistence.search;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.service.WineLabelImagePublicationService;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.infrastructure.persistence.adapter.WinePersistenceAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The unfiltered staff wine listing ({@code GET /admin/wines}) includes inactive wines, so the active-only
 * name index alone cannot serve it; PostgreSQL then sorted the whole table for each page, which timed out on
 * a 1.7M-wine catalog (#345 B31). This guard explains the exact statement the repository runs against a
 * catalog large enough for the planner to prefer an index.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false",
        "spring.jpa.properties.hibernate.session_factory.statement_inspector="
                + "com.vinnot.wine.infrastructure.persistence.search.RecordingStatementInspector"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({WinePersistenceAdapter.class, WineSearchNativeRepository.class, WineLabelImagePublicationService.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class StaffWineListingPlanPostgresIntegrationTest {

    private static final int CATALOG_SIZE = 30_000;
    private static final int WINERY_COUNT = 3_000;
    /** No identity, substring or trigram match, so every tier runs and the typo-tolerant one comes last. */
    private static final String UNMATCHED_SEARCH = "Qzxwv plumbus";

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static boolean seeded;

    @Autowired
    private WineRepositoryPort wineRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void seedALargeCatalogOnce() {
        if (seeded) {
            return;
        }
        // Every tenth winery is inactive; the typo-tolerant tier also matches winery names. The planner may
        // still scan a winery table this small, so the guards below pin the wine reads only.
        jdbcTemplate.update("""
                INSERT INTO wineries (id, name, is_active)
                SELECT gen_random_uuid(), 'Staff listing winery ' || lpad(g::text, 6, '0'), g % 10 <> 1
                FROM generate_series(1, ?) AS g
                """, WINERY_COUNT);
        // Every tenth wine is inactive, including the first by name, which only staff may list.
        jdbcTemplate.update("""
                INSERT INTO wines (id, name, wine_type, is_active, winery_id)
                SELECT gen_random_uuid(), '000 Staff listing ' || lpad(g::text, 6, '0'), 'RED', g % 10 <> 1,
                       seeded.ids[g % cardinality(seeded.ids) + 1]
                FROM generate_series(1, ?) AS g
                CROSS JOIN (SELECT array_agg(id) AS ids FROM wineries) AS seeded
                """, CATALOG_SIZE);
        jdbcTemplate.execute("ANALYZE wineries");
        jdbcTemplate.execute("ANALYZE wines");
        seeded = true;
    }

    @Test
    void unfilteredStaffPageMergesNameIndexesInsteadOfSortingTheWholeCatalog() {
        List<Wine> page = staffOrPublicPage(true);

        assertThat(page).hasSize(20);
        assertThat(page.get(0).getName()).isEqualTo("000 Staff listing 000001");
        assertThat(page.get(0).isActive()).isFalse();
        assertThat(page).extracting(Wine::getName).isSorted();
        String plan = explainLastPageStatement();
        List<String> secondPage = wineRepository.searchAdvanced(null, null, null, null, null, null,
                PageQuery.of(1, 20), true).content().stream().map(Wine::getName).toList();
        assertThat(secondPage).as("pages continue in name order across active and inactive wines")
                .containsExactlyElementsOf(IntStream.rangeClosed(21, 40)
                        .mapToObj(n -> "000 Staff listing %06d".formatted(n)).toList());
        assertThat(plan).contains("idx_wines_active_name_page", "idx_wines_inactive_name_page")
                .doesNotContain("Seq Scan on wines");
    }

    @Test
    void unfilteredPublicPageKeepsUsingTheActiveNameIndex() {
        List<Wine> page = staffOrPublicPage(false);

        assertThat(page).hasSize(20);
        assertThat(page.get(0).getName()).isEqualTo("000 Staff listing 000002");
        assertThat(page).allMatch(Wine::isActive);
        String plan = explainLastPageStatement();
        assertThat(plan).contains("idx_wines_active_name_page").doesNotContain("Seq Scan on wines");
    }

    /**
     * A staff search nothing matches reaches the typo-tolerant tier. Without trigram indexes covering inactive
     * wines it compared every wine name and timed out on the production catalog, so the request answered 500.
     */
    @Test
    void unmatchedStaffSearchReadsTrigramIndexesInsteadOfScanningTheCatalog() {
        PageResult<Wine> result = unmatchedSearch(true);

        assertThat(result.content()).isEmpty();
        assertThat(result.totalElements()).isZero();
        // Active rows read the V3 trigram index; inactive rows read an inactive-only index (with this few
        // inactive wines the planner may prefer the V61 name index over the V85 trigram one).
        assertThat(explainLastFuzzyStatement())
                .contains("idx_wines_active_name_trgm", "idx_wines_inactive_name_")
                .doesNotContain("Seq Scan on wines");
        assertThat(jdbcTemplate.queryForList("""
                SELECT indexdef FROM pg_indexes
                WHERE indexname IN ('idx_wines_inactive_name_trgm', 'idx_wineries_inactive_name_trgm')
                """, String.class))
                .hasSize(2)
                .allSatisfy(definition -> assertThat(definition)
                        .contains("gin (name gin_trgm_ops)", "WHERE (is_active = false)"));
    }

    @Test
    void unmatchedPublicSearchKeepsReadingTheActiveTrigramIndexes() {
        PageResult<Wine> result = unmatchedSearch(false);

        assertThat(result.content()).isEmpty();
        assertThat(result.totalElements()).isZero();
        assertThat(explainLastFuzzyStatement())
                .contains("idx_wines_active_name_trgm")
                .doesNotContain("inactive", "Seq Scan on wines");
    }

    private PageResult<Wine> unmatchedSearch(boolean includeInactive) {
        RecordingStatementInspector.clear();
        return wineRepository.searchAdvanced(UNMATCHED_SEARCH, null, null, null, null, null,
                PageQuery.of(0, 20), includeInactive);
    }

    private String explainLastFuzzyStatement() {
        String fuzzySql = RecordingStatementInspector.statements().stream()
                .filter(sql -> sql.contains("similarity("))
                .reduce((first, second) -> second)
                .orElseThrow();
        // The search text is the only text parameter; the others are candidate and page limits.
        String literalSql = fuzzySql.replace("CAST(? AS TEXT)", "CAST('" + UNMATCHED_SEARCH + "' AS TEXT)")
                .replace("?", "20");
        return String.join("\n", jdbcTemplate.queryForList("EXPLAIN " + literalSql, String.class));
    }

    private List<Wine> staffOrPublicPage(boolean includeInactive) {
        RecordingStatementInspector.clear();
        return wineRepository.searchAdvanced(null, null, null, null, null, null,
                PageQuery.of(0, 20), includeInactive).content();
    }

    private String explainLastPageStatement() {
        String pageSql = RecordingStatementInspector.statements().stream()
                .filter(sql -> sql.contains("page_ids"))
                .reduce((first, second) -> second)
                .orElseThrow();
        // The page statement only takes page sizes and offsets; any small value gives the page's plan.
        String literalSql = pageSql.replace("?", "20");
        return String.join("\n", jdbcTemplate.queryForList("EXPLAIN " + literalSql, String.class));
    }
}
