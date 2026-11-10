package com.vinnot.wine.infrastructure.persistence.search;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.service.WineLabelImagePublicationService;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.infrastructure.persistence.adapter.WinePersistenceAdapter;
import com.vinnot.wine.infrastructure.persistence.search.ExecutedPlanCapture.ExecutedPlan;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Production answered 500 for wine searches that combine text, country and grape filters (#531): the text lived
 * in the catalog read model and the filters on {@code wines}, so PostgreSQL walked every Argentine wine or every
 * text match, and a common grape filter read a lossy trigram bitmap and sorted it. These guards seed a catalog with
 * the production shape (Argentina about 2.5% of wines, common grapes at 4-5%, grape names repeated in wine names)
 * on a server with the production memory settings, run the repository, and check the plans PostgreSQL executed:
 * each statement must be served by the filtered search indexes and read a bounded number of pages.
 */
@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({WinePersistenceAdapter.class, WineSearchNativeRepository.class, WineLabelImagePublicationService.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class FilteredWineSearchPlanPostgresIntegrationTest {

    private static final int CATALOG_SIZE = 150_000;
    /** A filtered page now reads its candidates through an index; the old plans read thousands of pages here. */
    private static final long PAGE_BUDGET = 600;

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withCommand("postgres",
                    "-c", "shared_buffers=96MB",
                    "-c", "work_mem=2MB",
                    "-c", "effective_cache_size=768MB",
                    "-c", "shared_preload_libraries=auto_explain",
                    "-c", "auto_explain.log_analyze=on",
                    "-c", "auto_explain.log_buffers=on",
                    "-c", "auto_explain.log_timing=off");

    private static boolean seeded;

    @Autowired
    private WineRepositoryPort wineRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void seedAProductionShapedCatalogOnce() {
        if (seeded) {
            return;
        }
        jdbcTemplate.update("""
                INSERT INTO regions (id, name, country_id)
                SELECT gen_random_uuid(), 'Plan region ' || lpad(g::text, 3, '0'),
                       (SELECT id FROM countries ORDER BY name OFFSET g % 80 LIMIT 1)
                FROM generate_series(1, 600) AS g
                """);
        // Row triggers would maintain the V86 read models one wine at a time; the catalog is loaded with them off
        // and V86 itself rebuilds the read models below, as it does on the production catalog.
        jdbcTemplate.execute("ALTER TABLE wines DISABLE TRIGGER trg_insert_wine_filter_search");
        jdbcTemplate.update("""
                INSERT INTO wineries (id, name, is_active)
                SELECT gen_random_uuid(), 'Plan winery ' || lpad(g::text, 5, '0'), true
                FROM generate_series(1, 3000) AS g
                """);
        // Argentina holds every 40th wine (2.5%) and favours Malbec; Cabernet Sauvignon covers 5% of wines,
        // Merlot 4%, Nebbiolo 30 wines, a long tail of other grapes and wines without grapes the rest. Half of
        // the wines with a grape repeat it in their name, as the imported catalog does.
        jdbcTemplate.update("""
                INSERT INTO wines (id, name, wine_type, is_active, winery_id, country_id, region_id, grapes)
                SELECT gen_random_uuid(),
                       (ARRAY['Alta','Gran','Reserva','Linaje','Origen','Familia','Icono','Estate'])[1 + h % 8]
                         || ' ' || substr(md5(g::text), 1, 8)
                         || CASE WHEN grape IS NOT NULL AND (h / 8) % 2 = 0 THEN ' ' || grape ELSE '' END,
                       (ARRAY['RED','RED','RED','WHITE','WHITE','ROSE','SPARKLING','DESSERT'])[1 + (h / 7) % 8],
                       true, ref.wineries[1 + h % cardinality(ref.wineries)],
                       CASE WHEN g % 40 = 0 THEN ref.argentina
                            ELSE ref.others[1 + g % cardinality(ref.others)] END,
                       ref.regions[1 + (h / 3) % cardinality(ref.regions)],
                       CASE WHEN grape IS NULL THEN NULL ELSE jsonb_build_array(grape) END
                FROM (
                    SELECT g, h,
                           CASE WHEN g % 5000 = 7 THEN 'Nebbiolo'
                                WHEN g % 40 = 0 AND p < 40 THEN 'Malbec'
                                WHEN p < 45 THEN NULL
                                WHEN p < 50 THEN 'Cabernet Sauvignon'
                                WHEN p < 54 THEN 'Merlot'
                                WHEN p < 58 THEN 'Pinot Noir'
                                WHEN p < 63 THEN 'Chardonnay'
                                WHEN p < 95 THEN 'Plan grape ' || (h % 400)
                           END AS grape
                    FROM (SELECT g, abs(hashint4(g)) AS h, abs(hashint4(g + 104729)) % 100 AS p
                          FROM generate_series(1, ?) AS g) AS raw
                ) AS seed
                CROSS JOIN (
                    SELECT (SELECT array_agg(id ORDER BY id) FROM wineries) AS wineries,
                           (SELECT id FROM countries WHERE name = 'Argentina') AS argentina,
                           (SELECT array_agg(id ORDER BY name) FROM countries WHERE name <> 'Argentina') AS others,
                           (SELECT array_agg(id ORDER BY name) FROM regions) AS regions
                ) AS ref
                """, CATALOG_SIZE);
        // The owner's second search: "cabernet" with grape Merlot in Argentina matches only these blends.
        jdbcTemplate.update("""
                INSERT INTO wines (id, name, wine_type, is_active, country_id, grapes)
                SELECT gen_random_uuid(), 'Cabernet blend ' || g, 'RED', true,
                       (SELECT id FROM countries WHERE name = 'Argentina'), '["Merlot", "Cabernet Franc"]'
                FROM generate_series(1, 12) AS g
                """);
        rerunMigration();
        jdbcTemplate.execute("VACUUM ANALYZE");
        seeded = true;
    }

    @Test
    void textAndCountryReadTheFilteredCatalogIndexInsteadOfEveryArgentineWine() {
        AtomicReference<PageResult<Wine>> page = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> page.set(search("merlot", null, "Argentina", null, null, 0)));

        assertThat(page.get().content()).extracting(Wine::getId)
                .containsExactlyElementsOf(expectedTextPage("merlot:*", "merlot",
                        "AND w.country_id = (SELECT id FROM countries WHERE name = 'Argentina')"));
        assertThat(page.get().content()).isNotEmpty();
        assertBoundedAndIndexed(plans, "idx_wine_catalog_filter_search");
    }

    @Test
    void textGrapeAndCountryIntersectInsideOneIndex() {
        AtomicReference<PageResult<Wine>> page = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> page.set(search("cabernet", null, "Argentina", null, "Merlot", 0)));

        assertThat(page.get().content()).extracting(Wine::getName)
                .hasSize(12).allMatch(name -> name.startsWith("Cabernet blend "));
        assertThat(page.get().content()).extracting(Wine::getId)
                .containsExactlyElementsOf(expectedTextPage("cabernet:*", "cabernet",
                        "AND w.country_id = (SELECT id FROM countries WHERE name = 'Argentina') "
                                + "AND CAST(w.grapes AS TEXT) ILIKE '%%Merlot%%'"));
        assertBoundedAndIndexed(plans, "idx_wine_catalog_filter_search");
    }

    /** Nothing matches, so the containment and typo-tolerant tiers run too; each must stay bounded. */
    @Test
    void unmatchedFilteredSearchKeepsEveryTierBounded() {
        AtomicReference<PageResult<Wine>> page = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> page.set(search("cabernet", null, "Argentina", null, "Nebbiolo", 0)));

        assertThat(page.get().content()).isEmpty();
        assertThat(plans).hasSizeGreaterThanOrEqualTo(3);
        assertThat(plans).allSatisfy(plan -> assertThat(plan.sharedBuffers())
                .as(plan.text()).isLessThan(PAGE_BUDGET * 3));
        assertThat(plans).allSatisfy(plan -> assertThat(plan.text()).doesNotContain("Seq Scan on wines"));
    }

    @Test
    void commonGrapePagesWalkTheGrapeNameIndexInsteadOfSortingEveryMatch() {
        AtomicReference<PageResult<Wine>> first = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> first.set(search(null, null, null, null, "Cabernet Sauvignon", 0)));
        PageResult<Wine> fourth = search(null, null, null, null, "Cabernet Sauvignon", 3);

        assertThat(first.get().content()).extracting(Wine::getId)
                .containsExactlyElementsOf(expectedGrapePage("Cabernet Sauvignon", "", 0));
        assertThat(fourth.content()).extracting(Wine::getId)
                .containsExactlyElementsOf(expectedGrapePage("Cabernet Sauvignon", "", 3));
        assertThat(first.get().totalElements()).isEqualTo(21);
        assertBoundedAndIndexed(plans, "idx_wine_grape_search_name_page");
    }

    @Test
    void rareGrapeReturnsEveryMatchInNameOrder() {
        AtomicReference<PageResult<Wine>> page = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> page.set(search(null, null, null, null, "nebbiolo", 0)));

        assertThat(page.get().content()).extracting(Wine::getId)
                .containsExactlyElementsOf(expectedGrapePage("nebbiolo", "", 0)).hasSize(20);
        assertThat(search(null, null, null, null, "nebbiolo", 1).content()).hasSize(10);
        assertBoundedAndIndexed(plans, "idx_wine_grape_search_name_page");
    }

    /** Merlot within one region is too sparse for the grape walk, so the exact filtered set answers the page. */
    @Test
    void sparseGrapeAndRegionFallBackToTheExactFilteredSet() {
        String region = jdbcTemplate.queryForObject("""
                SELECT r.name FROM regions r JOIN wines w ON w.region_id = r.id
                WHERE CAST(w.grapes AS TEXT) ILIKE '%Merlot%' AND r.name LIKE 'Plan region %'
                GROUP BY r.name ORDER BY count(*) DESC, r.name LIMIT 1
                """, String.class);
        AtomicReference<PageResult<Wine>> page = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> page.set(search(null, null, null, region, "Merlot", 0)));

        assertThat(page.get().content()).extracting(Wine::getId)
                .containsExactlyElementsOf(expectedGrapePage("Merlot",
                        "AND w.region_id IN (SELECT id FROM regions WHERE name = '" + region + "')", 0))
                .isNotEmpty();
        assertThat(plans).anySatisfy(plan -> assertThat(plan.text()).contains("idx_wine_catalog_filter_search"));
        assertThat(plans).allSatisfy(plan -> assertThat(plan.sharedBuffers()).as(plan.text())
                .isLessThan(PAGE_BUDGET * 3));
    }

    @Test
    void commonGrapeWithCountryWalksTheGrapeNameIndex() {
        AtomicReference<PageResult<Wine>> page = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> page.set(search(null, null, "Argentina", null, "Malbec", 0)));

        assertThat(page.get().content()).extracting(Wine::getId)
                .containsExactlyElementsOf(expectedGrapePage("Malbec",
                        "AND w.country_id = (SELECT id FROM countries WHERE name = 'Argentina')", 0))
                .hasSize(20);
        assertBoundedAndIndexed(plans, "idx_wine_grape_search_name_page");
    }

    /** Filters without a grape keep their composite name indexes (previous behavior). */
    @Test
    void countryOnlyPageKeepsTheCountryNameIndex() {
        AtomicReference<PageResult<Wine>> page = new AtomicReference<>();
        List<ExecutedPlan> plans = capture(() -> page.set(search(null, null, "Argentina", null, null, 0)));

        assertThat(page.get().content()).extracting(Wine::getId).containsExactlyElementsOf(jdbcTemplate.queryForList("""
                SELECT w.id FROM wines w WHERE w.is_active
                AND w.country_id = (SELECT id FROM countries WHERE name = 'Argentina')
                ORDER BY w.name LIMIT 20
                """, UUID.class));
        assertThat(plans).anySatisfy(plan -> assertThat(plan.text()).contains("idx_wines_active_country_name_page"));
    }

    /** V86 is re-runnable: it drops and rebuilds its read models from the current wines, in one transaction. */
    private void rerunMigration() {
        String script;
        try (InputStream migration = new ClassPathResource(
                "db/migration/V86__index_filtered_wine_search.sql").getInputStream()) {
            script = new String(migration.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> jdbcTemplate.execute(script));
    }

    private PageResult<Wine> search(String text, String type, String country, String region, String grape,
                                    int page) {
        return wineRepository.searchAdvanced(text, type, null, country, region, grape, PageQuery.of(page, 20), false);
    }

    private List<ExecutedPlan> capture(Runnable action) {
        return new ExecutedPlanCapture(jdbcTemplate, POSTGRES).capture(action);
    }

    private static void assertBoundedAndIndexed(List<ExecutedPlan> plans, String index) {
        assertThat(plans).isNotEmpty();
        assertThat(plans).allSatisfy(plan -> {
            assertThat(plan.sharedBuffers()).as("pages read by %s", plan.text()).isLessThan(PAGE_BUDGET);
            assertThat(plan.text()).doesNotContain("Seq Scan on wines", "lossy");
        });
        assertThat(plans).anySatisfy(plan -> assertThat(plan.text()).contains(index));
    }

    /** The prefix tier's ranking over every match, valid while fewer than 500 wines match. */
    private List<UUID> expectedTextPage(String tsQuery, String text, String filters) {
        return jdbcTemplate.queryForList("""
                SELECT w.id FROM wine_catalog_search c JOIN wines w ON w.id = c.wine_id
                WHERE w.is_active AND c.search_vector @@ to_tsquery('simple', ?) %s
                ORDER BY 2.0 + ts_rank_cd(c.search_vector, to_tsquery('simple', ?))
                         + CASE WHEN LOWER(w.name) = LOWER(?) THEN 2.0 ELSE 0.0 END DESC, w.name, w.id
                LIMIT 20
                """.formatted(filters), UUID.class, tsQuery, tsQuery, text);
    }

    private List<UUID> expectedGrapePage(String grape, String filters, int page) {
        List<UUID> ids = new ArrayList<>(jdbcTemplate.queryForList("""
                SELECT w.id FROM wines w
                WHERE w.is_active AND CAST(w.grapes AS TEXT) ILIKE '%%' || ? || '%%' %s
                ORDER BY w.name, w.id OFFSET ? LIMIT 20
                """.formatted(filters), UUID.class, grape, page * 20));
        return ids;
    }
}
