package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineLabelSearchCriteria;
import com.vinnot.wine.infrastructure.persistence.search.CatalogSearchAccentNormalizer;
import com.vinnot.wine.infrastructure.persistence.search.WineSearchNativeRepository;
import com.vinnot.shared.domain.valueobject.PageQuery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import com.vinnot.wine.application.exception.WineLabelCatalogSearchTimeoutException;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import com.vinnot.wine.application.service.WineLabelImagePublicationService;
import com.vinnot.wine.domain.model.Wine;
import jakarta.persistence.EntityManagerFactory;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.IntStream;
import org.hibernate.SessionFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doAnswer;

@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({WinePersistenceAdapter.class, WineSearchNativeRepository.class,
        WineLabelImagePublicationService.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class WinePersistenceAdapterPostgresIntegrationTest {

    private static final UUID ARGENTINA_ID =
            UUID.fromString("d31dc4d8-0ca2-4589-9830-5407cb9859c6");
    private static final UUID MENDOZA_ID =
            UUID.fromString("203fe15e-6984-47f6-9f6c-d909b4acecfd");

    @Container
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18-alpine");

    private final UUID wineId = UUID.randomUUID();
    private final UUID searchWineId = UUID.randomUUID();
    private final UUID otherWineId = UUID.randomUUID();
    private final UUID wineryId = UUID.randomUUID();

    @Autowired
    private WineRepositoryPort wineRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void highlightsAreRankedBeforeLimitingWithOneStatementAndNoCatalogCount() {
        List<UUID> ids = IntStream.rangeClosed(1, 6)
                .mapToObj(i -> UUID.fromString("00000000-0000-0000-0000-00000000000" + i)).toList();
        try {
            for (UUID id : ids) {
                jdbcTemplate.update("""
                        INSERT INTO wines (id, name, wine_type, country_id, region_id)
                        VALUES (?, 'Highlights fixture', 'RED', ?, ?)
                        """, id, ARGENTINA_ID, MENDOZA_ID);
            }
            for (int i = 0; i < 3; i++) {
                jdbcTemplate.update("UPDATE wines SET rating_average=5, rating_count=? WHERE id=?",
                        i < 2 ? 10 : 1, ids.get(i));
            }
            jdbcTemplate.update("UPDATE wines SET rating_average=4.8, rating_count=999 WHERE id=?", ids.get(3));
            jdbcTemplate.update("UPDATE wines SET rating_average=5, rating_count=0 WHERE id=?", ids.get(4));
            jdbcTemplate.update("UPDATE wines SET rating_average=5, rating_count=20, is_active=false WHERE id=?", ids.get(5));
            var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
            statistics.clear();
            assertThat(wineRepository.findHighlights(2)).extracting(Wine::getId)
                    .containsExactly(ids.get(0), ids.get(1));
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
            statistics.clear();
            assertThat(wineRepository.findHighlights(10)).extracting(Wine::getId)
                    .containsExactlyElementsOf(ids.subList(0, 4));
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        } finally {
            ids.forEach(id -> jdbcTemplate.update("DELETE FROM wines WHERE id=?", id));
        }
    }

    @MockitoSpyBean
    private WineSearchNativeRepository searchRepository;

    @ParameterizedTest
    @ValueSource(strings = {"fuzzy", "indexed", "commercial"})
    void timedOutCandidateQueryDoesNotAbortTheOwningPublicationTransaction(String strategy) {
        var timeout = doAnswer(invocation -> {
            // Cancel a real PostgreSQL statement: catching an exception alone cannot
            // recover a transaction after SQLSTATE 57014.
            jdbcTemplate.execute("SET LOCAL statement_timeout = '50ms'");
            jdbcTemplate.execute("SELECT pg_sleep(0.2)");
            return List.of();
        }).when(searchRepository);
        switch (strategy) {
            case "fuzzy" -> timeout.findByFuzzyMatch(anyList(), any(), any(), any(), anyInt());
            case "indexed" -> timeout.findByIndexedIdentity(anyList(), anyInt());
            case "commercial" -> timeout.findByCommercialIdentity(anyList(), any(), any(), any(), anyInt());
            default -> throw new IllegalArgumentException(strategy);
        }
        var criteria = new WineLabelSearchCriteria(List.of("Boundary"), null, null, null, 20);
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            // Keep a write and its row lock in the caller, as submission approval does.
            jdbcTemplate.update("UPDATE wines SET image_url = 'before-search.jpg' WHERE id = ?", wineId);
            assertThatThrownBy(() -> {
                switch (strategy) {
                    case "fuzzy" -> wineRepository.findByFuzzyMatch(criteria);
                    case "indexed" -> wineRepository.findByIndexedIdentity(criteria);
                    case "commercial" -> wineRepository.findByCommercialIdentity(criteria);
                    default -> throw new IllegalArgumentException(strategy);
                }
            }).isInstanceOf(WineLabelCatalogSearchTimeoutException.class);
            assertThat(wineRepository.findById(searchWineId)).isPresent();
            jdbcTemplate.update("UPDATE wines SET image_url = 'publication-completed.webp' WHERE id = ?", wineId);
        });
        assertThat(jdbcTemplate.queryForObject("SELECT image_url FROM wines WHERE id = ?", String.class, wineId))
                .isEqualTo("publication-completed.webp");
    }

    @Autowired
    private WineLabelImagePublicationService imagePublication;

    @Test
    void concurrentVerifiedImagesHaveOneWinnerWithoutOverwritingIt() throws Exception {
        long revision = wineRepository.findById(wineId).orElseThrow().getRevision();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                start.await();
                return imagePublication.publish(wineId, revision, "first.jpg");
            });
            var second = executor.submit(() -> {
                start.await();
                return imagePublication.publish(wineId, revision, "second.jpg");
            });
            start.countDown();
            var a = first.get(10, TimeUnit.SECONDS);
            var b = second.get(10, TimeUnit.SECONDS);
            assertThat(a.attached()).isNotEqualTo(b.attached());
            assertThat(a.imageUrl()).isEqualTo(b.imageUrl());
            assertThat(wineRepository.findById(wineId).orElseThrow().getImageUrl()).isEqualTo(a.imageUrl());
        }
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void insertWineWithLocation() {
        jdbcTemplate.update("""
                INSERT INTO wines (id, name, wine_type, country_id, region_id)
                VALUES (?, ?, ?, ?, ?)
                """, wineId, "100 X 100 Adapter Boundary Malbec", "RED",
                ARGENTINA_ID, MENDOZA_ID);
        jdbcTemplate.update("INSERT INTO wineries (id, name) VALUES (?, ?)",
                wineryId, "Tapiz Search Boundary");
        jdbcTemplate.update("""
                INSERT INTO wines (id, winery_id, name, wine_type, country_id, region_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """, searchWineId, wineryId, "Black Tears Malbec", "RED",
                ARGENTINA_ID, MENDOZA_ID);
        jdbcTemplate.update("""
                INSERT INTO wines (id, winery_id, name, wine_type, country_id, region_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """, otherWineId, wineryId, "Black Tears White", "WHITE",
                ARGENTINA_ID, MENDOZA_ID);
    }

    @AfterEach
    void deleteWine() {
        jdbcTemplate.update("DELETE FROM wines WHERE id IN (?, ?, ?)",
                wineId, searchWineId, otherWineId);
        jdbcTemplate.update("DELETE FROM wineries WHERE id = ?", wineryId);
    }

    @Test
    void tokenizesCompactOcrNumberAndProductWithoutChangingUnicodeScript() {
        jdbcTemplate.update("UPDATE wines SET name = ? WHERE id = ?", "13. Cabernet", wineId);
        assertThat(wineRepository.findByIndexedIdentity(new WineLabelSearchCriteria(
                List.of("13.Cabernet"), null, null, null, 60)))
                .extracting(Wine::getId).contains(wineId);
        jdbcTemplate.update("UPDATE wines SET name = ? WHERE id = ?", "Gran Cabernet Sauvignon", wineId);
        assertThat(wineRepository.findByIndexedIdentity(new WineLabelSearchCriteria(
                List.of("Gran-Cabernet Sauvignon"), null, null, null, 60)))
                .extracting(Wine::getId).contains(wineId);
    }

    @Test
    void ranksIndexedIdentityBeforeTruncatingAnOversizedCandidatePool() {
        jdbcTemplate.update("UPDATE wineries SET name = ? WHERE id = ?", "Candidate Boundary", wineryId);
        UUID expected = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff");
        try {
            for (int index = 0; index < 75; index++) {
                jdbcTemplate.update("INSERT INTO wines (id, winery_id, name, wine_type) VALUES (?, ?, ?, 'RED')",
                        new UUID(0, index + 1), wineryId, "Malbec Reserva Vineyard Block " + index);
            }
            jdbcTemplate.update("INSERT INTO wines (id, winery_id, name, wine_type) VALUES (?, ?, ?, 'RED')",
                    expected, wineryId, "Malbec");
            var criteria = new WineLabelSearchCriteria(List.of("Candidate Boundary Malbec"), null, null, null, 60);
            var first = wineRepository.findByIndexedIdentity(criteria).stream()
                    .map(Wine::getId).toList();
            var repeated = wineRepository.findByIndexedIdentity(criteria).stream()
                    .map(Wine::getId).toList();
            assertThat(first).hasSize(60).startsWith(expected);
            assertThat(repeated).isEqualTo(first);
        } finally {
            jdbcTemplate.update("DELETE FROM wines WHERE winery_id = ?", wineryId);
        }
    }

    @Test
    void materializesLocationBeforeReturningDomainWine() {
        var wine = wineRepository.findById(wineId).orElseThrow();

        assertThat(wine.getCountryId()).isEqualTo(ARGENTINA_ID);
        assertThat(wine.getCountryCode()).isEqualTo("ar");
        assertThat(wine.getCountryName()).isEqualTo("Argentina");
        assertThat(wine.getRegionId()).isEqualTo(MENDOZA_ID);
        assertThat(wine.getRegionName()).isEqualTo("Mendoza");
    }

    @Test
    void retrievesCompoundCommercialIdentityOnRealPostgres() {
        var results = wineRepository.findByCommercialIdentity(
                new WineLabelSearchCriteria(
                        List.of("100 x 100"), null, null, "RED", 20));

        assertThat(results).extracting(wine -> wine.getId()).contains(wineId);
    }

    @Test
    void retrievesFuzzyCandidatesWithBranchLimitsOnRealPostgres() {
        var results = wineRepository.findByFuzzyMatch(
                new WineLabelSearchCriteria(
                        List.of("100 X 100", "Adapter Boundary"),
                        null, "Malbec", "RED", 20));

        assertThat(results).extracting(wine -> wine.getId()).contains(wineId);
    }

    @Test
    void retrievesIndexedFallbackCandidatesOnRealPostgres() {
        var results = wineRepository.findByIndexedIdentity(
                new WineLabelSearchCriteria(
                        List.of("Adapter Boundary Malbec"),
                        null, null, null, 20));
        var blackTearsResults = wineRepository.findByIndexedIdentity(
                new WineLabelSearchCriteria(
                        List.of("BLACK TEARS", "TAPIZ", "MALBEC", "2020"),
                        2020, "Malbec", "RED", 20));

        assertThat(results).extracting(wine -> wine.getId()).contains(wineId);
        assertThat(blackTearsResults)
                .extracting(wine -> wine.getId())
                .contains(searchWineId);
    }

    @Test
    void characterizesCatalogUnicodePunctuationAndRepeatedPageResults() {
        // Punctuation alone is not a search word; letters of any script are.
        assertThat(wineRepository.searchAdvanced("!!!", null, wineryId,
                null, null, null, PageQuery.of(0, 20), false).content())
                .extracting(wine -> wine.getId()).containsExactly(searchWineId, otherWineId);
        assertThat(wineRepository.searchAdvanced("東京", null, wineryId,
                null, null, null, PageQuery.of(0, 20), false).content()).isEmpty();
        jdbcTemplate.update("UPDATE wines SET name=? WHERE id=?", "東京 Reserva", otherWineId);
        assertThat(wineRepository.searchAdvanced("東京", null, wineryId,
                null, null, null, PageQuery.of(0, 20), false).content())
                .extracting(wine -> wine.getId()).containsExactly(otherWineId);
        jdbcTemplate.update("UPDATE wines SET name=? WHERE id=?", "Black Tears White", otherWineId);
        jdbcTemplate.update("UPDATE wines SET name=? WHERE id=?", "Éxito Reserva", searchWineId);
        assertThat(wineRepository.searchAdvanced("Éxito", null, wineryId,
                null, null, null, PageQuery.of(0, 20), false).content())
                .extracting(wine -> wine.getId()).containsExactly(searchWineId);

        jdbcTemplate.update("UPDATE wines SET name=? WHERE id=?", "Black Tears Malbec", searchWineId);
        var first = wineRepository.searchAdvanced("Tapiz", null, wineryId,
                null, null, null, PageQuery.of(0, 1), false);
        var second = wineRepository.searchAdvanced("Tapiz", null, wineryId,
                null, null, null, PageQuery.of(1, 1), false);
        var repeated = wineRepository.searchAdvanced("Tapiz", null, wineryId,
                null, null, null, PageQuery.of(0, 1), false);
        assertThat(first.content()).extracting(wine -> wine.getId()).containsExactly(searchWineId);
        assertThat(second.content()).extracting(wine -> wine.getId()).containsExactly(otherWineId);
        assertThat(repeated.content()).extracting(wine -> wine.getId()).containsExactly(searchWineId);
        assertThat(first.totalElements()).isEqualTo(2);
        assertThat(second.totalElements()).isEqualTo(2);
    }

    @Test
    void findsAndNormalizesRowsIndexedBeforeAccentInsensitiveSearch() {
        jdbcTemplate.update("UPDATE wines SET name=? WHERE id=?", "Séptima Reserva Malbec", searchWineId);
        // Rows indexed by the build functions before V90 kept their accents.
        for (String readModel : List.of("wine_catalog_search", "wine_catalog_filter_search")) {
            jdbcTemplate.update("UPDATE " + readModel + " SET search_vector = "
                    + "setweight(to_tsvector('simple', ?), 'A') || setweight(to_tsvector('simple', ?), 'B'), "
                    + "search_text = lower(? || ' ' || ?) WHERE wine_id = ?",
                    "Séptima Reserva Malbec", "Tapiz Search Boundary",
                    "Séptima Reserva Malbec", "Tapiz Search Boundary", searchWineId);
        }
        // Until normalized, a row is still found as before: by its accented form.
        assertFoundBySearch(searchWineId, "Séptima", "épt");
        assertThat(wineRepository.findByIndexedIdentity(new WineLabelSearchCriteria(
                List.of("Séptima Reserva"), null, null, null, 20))).extracting(Wine::getId).contains(searchWineId);

        var normalizer = new CatalogSearchAccentNormalizer(jdbcTemplate, true, 1, Duration.ofMillis(1));
        assertThat(normalizer.normalizePending()).isGreaterThanOrEqualTo(2);
        for (String readModel : List.of("wine_catalog_search", "wine_catalog_filter_search")) {
            assertThat(jdbcTemplate.queryForObject("SELECT search_text FROM " + readModel + " WHERE wine_id = ?",
                    String.class, searchWineId)).isEqualTo("septima reserva malbec tapiz search boundary");
        }
        assertFoundBySearch(searchWineId, "septima", "Séptima", "ept", "épt");
        assertThat(wineRepository.findByIndexedIdentity(new WineLabelSearchCriteria(
                List.of("SEPTIMA RESERVA"), null, null, null, 20))).extracting(Wine::getId).contains(searchWineId);
        assertThat(normalizer.normalizePending()).isZero();

        // A full pass without work stops the normalizer until the next start.
        jdbcTemplate.update("UPDATE wine_catalog_search SET search_text = 'séptima' WHERE wine_id = ?", searchWineId);
        assertThat(normalizer.normalizePending()).isZero();
        assertThat(new CatalogSearchAccentNormalizer(jdbcTemplate, false, 10, Duration.ZERO).normalizePending())
                .isZero();
        assertThat(new CatalogSearchAccentNormalizer(jdbcTemplate, true, 10_000, Duration.ZERO).normalizePending())
                .isEqualTo(1);
    }

    private void assertFoundBySearch(UUID expected, String... terms) {
        for (String term : terms) {
            assertThat(wineRepository.searchAdvanced(term, null, null, null, null, null,
                    PageQuery.of(0, 20), false).content()).as(term).extracting(Wine::getId).contains(expected);
            assertThat(wineRepository.searchAdvanced(term, "RED", null, null, null, null,
                    PageQuery.of(0, 20), false).content()).as(term + " filtered")
                    .extracting(Wine::getId).contains(expected);
        }
    }

    @Test
    void retrievesTheActiveCatalogOfTheObservedProducer() {
        jdbcTemplate.update("UPDATE wineries SET name=? WHERE id=?", "Bodega Camuñas Límite", wineryId);
        jdbcTemplate.update("UPDATE wines SET is_active=false WHERE id=?", otherWineId);
        for (String core : List.of("camunas limite", "limite")) {
            assertThat(wineRepository.findByProducerIdentity(new WineLabelSearchCriteria(
                    List.of(core), null, null, null, 150)))
                    .as(core).extracting(Wine::getId).containsExactly(searchWineId);
        }
        for (String core : List.of("limite camunas", "camu", "black tears")) {
            assertThat(wineRepository.findByProducerIdentity(new WineLabelSearchCriteria(
                    List.of(core), null, null, null, 150)))
                    .as(core).extracting(Wine::getId).doesNotContain(searchWineId);
        }
        jdbcTemplate.update("UPDATE wines SET is_active=true WHERE id=?", otherWineId);
        assertThat(wineRepository.findByProducerIdentity(new WineLabelSearchCriteria(
                List.of("camunas limite"), null, null, null, 1))).hasSize(1);
    }

    @Test
    void matchesCatalogIdentityWithoutDependingOnAccents() {
        jdbcTemplate.update("UPDATE wines SET name=? WHERE id=?", "Séptima Reserva Malbec", searchWineId);
        jdbcTemplate.update("UPDATE wineries SET name=? WHERE id=?", "Bodega Peñaflor Ñandú", wineryId);

        for (String term : List.of("SEPTIMA RESERVA", "Séptima Reserva", "PENAFLOR NANDU")) {
            assertThat(wineRepository.findByIndexedIdentity(new WineLabelSearchCriteria(
                    List.of(term), null, null, null, 20)))
                    .as(term).extracting(Wine::getId).contains(searchWineId);
        }
        for (String term : List.of("septima", "SÉPTIMA reserva", "sept", "ept", "penaflor", "Ñandú")) {
            assertThat(wineRepository.searchAdvanced(term, null, null, null, null, null,
                    PageQuery.of(0, 20), false).content())
                    .as(term).extracting(Wine::getId).contains(searchWineId);
            assertThat(wineRepository.searchAdvanced(term, "RED", null, null, null, null,
                    PageQuery.of(0, 20), false).content())
                    .as(term + " filtered").extracting(Wine::getId).containsExactly(searchWineId);
        }
    }

    @Test
    void searchesWineAndWineryIdentityOnRealPostgres() {
        var byWineName = wineRepository.searchAdvanced(
                "Black Tears", null, null, null, null, null,
                PageQuery.of(0, 20), false);
        var acrossWineAndWinery = wineRepository.searchAdvanced(
                "Tapiz Malbec", null, null, null, null, null,
                PageQuery.of(0, 20), false);
        var byThreeLetterWineSubstring = wineRepository.searchAdvanced(
                "ack", null, null, null, null, null,
                PageQuery.of(0, 20), false);
        var byThreeLetterWinerySubstring = wineRepository.searchAdvanced(
                "piz", null, null, null, null, null,
                PageQuery.of(0, 20), false);
        var acrossThreeLetterSubstrings = wineRepository.searchAdvanced(
                "piz ack", null, null, null, null, null,
                PageQuery.of(0, 20), false);

        assertThat(byWineName.content())
                .extracting(wine -> wine.getId())
                .contains(searchWineId);
        assertThat(acrossWineAndWinery.content())
                .extracting(wine -> wine.getId())
                .contains(searchWineId);
        assertThat(byThreeLetterWineSubstring.content())
                .extracting(wine -> wine.getId())
                .contains(searchWineId);
        assertThat(byThreeLetterWinerySubstring.content())
                .extracting(wine -> wine.getId())
                .contains(searchWineId);
        assertThat(acrossThreeLetterSubstrings.content())
                .extracting(wine -> wine.getId())
                .contains(searchWineId);
    }

    @Test
    void fuzzySearchFilteredByWineryBuildsValidSql() {
        // Neither prefix nor containment matches the misspelt words, so only the
        // typo-tolerant tier runs, with the winery filter appended to both branches.
        var result = wineRepository.searchAdvanced(
                "Blak Tears Malbek", null, wineryId, null, null, null,
                PageQuery.of(0, 20), false);

        assertThat(result.content()).extracting(wine -> wine.getId())
                .contains(searchWineId)
                .doesNotContain(wineId);
    }

    @Test
    void staffListingIncludesInactiveWinesInEverySearchPath() {
        jdbcTemplate.update("UPDATE wines SET is_active = false WHERE id = ?", searchWineId);
        BiFunction<String, Boolean, List<UUID>> catalog = (search, includeInactive) ->
                wineRepository.searchAdvanced(search, null, null, null, null, null,
                        PageQuery.of(0, 50), includeInactive).content().stream()
                        .map(Wine::getId).toList();
        Function<Boolean, List<UUID>> filtered = includeInactive ->
                wineRepository.searchAdvanced(null, "RED", wineryId, null, null, null,
                        PageQuery.of(0, 50), includeInactive).content().stream()
                        .map(Wine::getId).toList();

        // Public catalog behaviour is unchanged: inactive wines stay hidden.
        assertThat(catalog.apply(null, false)).doesNotContain(searchWineId);
        assertThat(filtered.apply(false)).doesNotContain(searchWineId);
        assertThat(catalog.apply("Black Tears", false)).doesNotContain(searchWineId);
        assertThat(catalog.apply("Blak Tears Malbek", false)).doesNotContain(searchWineId);

        // Staff listing honours includeInactive in the plain, filtered, prefix and fuzzy paths.
        assertThat(catalog.apply(null, true)).contains(searchWineId);
        assertThat(filtered.apply(true)).containsExactly(searchWineId);
        assertThat(catalog.apply("Black Tears", true)).contains(searchWineId, otherWineId);
        assertThat(catalog.apply("ack", true)).contains(searchWineId);
        assertThat(catalog.apply("Blak Tears Malbek", true)).contains(searchWineId);
    }

    @Test
    void unmatchedSearchReturnsAnEmptyPageForStaffAndPublicCatalogs() {
        jdbcTemplate.update("UPDATE wines SET is_active = false WHERE id = ?", searchWineId);

        for (boolean includeInactive : List.of(true, false)) {
            var result = wineRepository.searchAdvanced("Qzxwv plumbus", null, null, null, null, null,
                    PageQuery.of(0, 20), includeInactive);

            assertThat(result.content()).as("includeInactive=%s", includeInactive).isEmpty();
            assertThat(result.totalElements()).as("includeInactive=%s", includeInactive).isZero();
        }
    }

    @Test
    void appliesFiltersBeforeLimitingCandidatesWithoutChangingMatches() {
        var redMatches = wineRepository.searchAdvanced(
                "Black Tears", "RED", null, "Argentina", "Mendoza", null,
                PageQuery.of(0, 20), false);
        var whiteMatches = wineRepository.searchAdvanced(
                "Black Tears", "WHITE", null, "Argentina", "Mendoza", null,
                PageQuery.of(0, 20), false);
        var filteredCatalog = wineRepository.searchAdvanced(
                null, "RED", null, "Argentina", "Mendoza", null,
                PageQuery.of(0, 20), false);

        assertThat(redMatches.content()).extracting(wine -> wine.getId())
                .contains(searchWineId)
                .doesNotContain(otherWineId);
        assertThat(whiteMatches.content()).extracting(wine -> wine.getId())
                .contains(otherWineId)
                .doesNotContain(searchWineId);
        assertThat(filteredCatalog.content()).extracting(wine -> wine.getId())
                .contains(wineId, searchWineId)
                .doesNotContain(otherWineId);
    }
}
