package com.vinnot.wine.infrastructure.persistence.search;

import com.vinnot.wine.infrastructure.persistence.entity.WineJpaEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

class WineSearchNativeRepositoryTest {

    @Test
    void separatesOcrHyphensAndDotsWithoutDroppingIdentityWords() {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(anyString(), eq(WineJpaEntity.class))).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of());
        repository.findByIndexedIdentity(List.of("GRAN-CABERNET SAUVIGNON", "13.Cabernet", "Malbec–Orgánico"), 60);
        verify(query).setParameter("indexedIdentity0Tokens", "GRAN CABERNET SAUVIGNON");
        verify(query).setParameter("indexedIdentity1Tokens", "13 Cabernet");
        verify(query).setParameter("indexedIdentity2Tokens", "Malbec Orgánico");
        verify(query).setParameter("indexedIdentity0", "GRAN-CABERNET SAUVIGNON");
    }

    @Test
    void searchesCatalogThroughOrderedPrefixContainmentAndFuzzyTiers() {
        EntityManager entityManager = mock(EntityManager.class);
        Query prefixQuery = mock(Query.class);
        Query containmentQuery = mock(Query.class);
        Query fuzzyQuery = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(
                anyString(), eq(WineJpaEntity.class)))
                .thenReturn(prefixQuery, containmentQuery, fuzzyQuery);
        when(prefixQuery.getResultList()).thenReturn(List.of());
        when(containmentQuery.getResultList()).thenReturn(List.of());
        when(fuzzyQuery.getResultList()).thenReturn(List.of());

        repository.searchAdvanced(
                "Black tears", null, null, null, null, null,
                PageRequest.of(0, 20), false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, times(3)).createNativeQuery(
                sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getAllValues().get(0))
                .contains("WITH candidate_scores AS")
                .contains("FROM wine_catalog_search catalog")
                .contains("catalog.search_vector @@")
                .doesNotContain(
                        "ORDER BY relevance DESC, w.id ASC LIMIT :candidateLimit")
                .doesNotContain("catalog.search_text LIKE")
                .doesNotContain("w.name % CAST(:searchText AS TEXT)");
        assertThat(sqlCaptor.getAllValues().get(1))
                .contains("WITH candidate_scores AS")
                .contains("catalog.search_text LIKE CAST(:containedWord0 AS TEXT)")
                .contains("catalog.search_text LIKE CAST(:containedWord1 AS TEXT)")
                .doesNotContain(
                        "ORDER BY relevance DESC, w.id ASC LIMIT :candidateLimit")
                .doesNotContain("catalog.search_vector @@")
                .doesNotContain("w.name % CAST(:searchText AS TEXT)");
        assertThat(sqlCaptor.getAllValues().get(2))
                .contains("w.name % CAST(:searchText AS TEXT)")
                .contains("wy.name % CAST(:searchText AS TEXT)")
                .contains("ORDER BY candidates.relevance DESC")
                .doesNotContain("OR wy.name ILIKE");
        verify(prefixQuery).setParameter("searchText", "Black tears");
        verify(prefixQuery).setParameter("searchTsQuery", "black:* & tears:*");
        verify(prefixQuery).setParameter("candidateLimit", 500);
        verify(prefixQuery).setHint("jakarta.persistence.query.timeout", 2_000);
        verify(containmentQuery).setParameter("containedWord0", "%black%");
        verify(containmentQuery).setParameter("containedWord1", "%tears%");
        verify(containmentQuery).setHint("jakarta.persistence.query.timeout", 3_000);
        verify(fuzzyQuery).setParameter("searchText", "Black tears");
        verify(fuzzyQuery).setHint("jakarta.persistence.query.timeout", 3_000);
    }

    @Test
    void prioritizesSubstringCompatibilityForThreeLetterSearches() {
        EntityManager entityManager = mock(EntityManager.class);
        Query containmentQuery = mock(Query.class);
        Query prefixQuery = mock(Query.class);
        Query fuzzyQuery = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(
                anyString(), eq(WineJpaEntity.class)))
                .thenReturn(containmentQuery, prefixQuery, fuzzyQuery);
        when(containmentQuery.getResultList()).thenReturn(List.of());
        when(prefixQuery.getResultList()).thenReturn(List.of());
        when(fuzzyQuery.getResultList()).thenReturn(List.of());

        repository.searchAdvanced(
                "piz", null, null, null, null, null,
                PageRequest.of(0, 20), false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, times(3)).createNativeQuery(
                sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getAllValues().get(0))
                .contains("catalog.search_text LIKE CAST(:containedWord0 AS TEXT)")
                .doesNotContain("catalog.search_vector @@");
        assertThat(sqlCaptor.getAllValues().get(1))
                .contains("catalog.search_vector @@")
                .doesNotContain("catalog.search_text LIKE");
        assertThat(sqlCaptor.getAllValues().get(2))
                .contains("w.name % CAST(:searchText AS TEXT)")
                .contains("wy.name % CAST(:searchText AS TEXT)");
    }

    @Test
    void prefiltersLabelCandidatesWithTrigramIndexOperators() {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(
                anyString(), eq(WineJpaEntity.class))).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of());

        repository.findByFuzzyMatch(
                List.of("Forastero", "Small Batch"),
                null,
                "Malbec",
                "RED",
                40);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(
                sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getValue())
                .contains("WITH candidate_scores AS")
                .contains("w.name % CAST(:identityTerm0 AS TEXT)")
                .contains("wy.name % CAST(:identityTerm0 AS TEXT)")
                .contains("LIMIT :branchLimit)")
                .contains("FROM candidate_ids candidates")
                .doesNotContain("similarity(w.name, CAST(:identityTerm0 AS TEXT)) > 0.1");
        verify(query).setParameter("branchLimit", 40);
        verify(query).setParameter("prefilterLimit", 200);
        verify(query).setParameter("resultLimit", 40);
        verify(query).setHint("jakarta.persistence.query.timeout", 1_500);
    }

    @Test
    void retrievesCommercialIdentifiersWithBoundOrderedContainment() {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(
                anyString(), eq(WineJpaEntity.class))).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of());

        repository.findByCommercialIdentity(
                List.of("100 x 100"), null, "Pinot Noir", "RED", 200);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(
                sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getValue())
                .contains("w.name ILIKE CAST(:commercialIdentity0 AS TEXT)")
                .contains("ORDER BY GREATEST(")
                .doesNotContain("100 x 100");
        verify(query).setParameter("commercialIdentity0", "%100%x%100%");
        verify(query).setParameter("commercialGrape", "Pinot Noir");
        verify(query).setParameter("commercialType", "RED");
        verify(query).setParameter("commercialLimit", 200);
        verify(query).setHint("jakarta.persistence.query.timeout", 1_500);
    }

    @Test
    void retrievesFallbackCandidatesOnlyThroughIndexedPredicates() {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(
                anyString(), eq(WineJpaEntity.class))).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of());

        repository.findByIndexedIdentity(
                List.of("Bad Brothers", "Facon Selection"), 60);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(
                sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getValue())
                .contains("WITH candidate_scores AS")
                .contains("FROM wine_catalog_search catalog")
                .contains("catalog.search_vector @@ plainto_tsquery('simple',")
                .contains("wy.name % CAST(:indexedIdentity0 AS TEXT)")
                .contains("MAX(identity_score)")
                .contains("ORDER BY identity_score DESC")
                .contains("LIMIT :indexedBranchLimit")
                .contains(
                        "ORDER BY identity_score DESC, w.id ASC "
                                + "LIMIT :indexedBranchLimit")
                .contains("CAST(:indexedIdentity0Tokens AS TEXT)), 2)")
                .contains("ORDER BY similarity(wy.name, CAST(:indexedIdentity0 AS TEXT)) DESC, w.id ASC")
                .doesNotContain("ILIKE");
        verify(query).setParameter("indexedIdentity0", "Bad Brothers");
        verify(query).setParameter("indexedIdentity1", "Facon Selection");
        verify(query).setParameter("indexedBranchLimit", 60);
        verify(query).setParameter("indexedResultLimit", 60);
        verify(query).setHint("jakarta.persistence.query.timeout", 750);
    }
    @Test
    void publicFuzzyTierKeepsItsActiveOnlyStatement() {
        assertThat(fuzzyStatement(false)).isEqualTo(PUBLIC_FUZZY_SQL);
    }

    @Test
    void filteredTiersReadOnlyTheFilteredCatalogWithIndexableFilterConditions() {
        EntityManager entityManager = mock(EntityManager.class);
        Query prefixQuery = mock(Query.class);
        Query containmentQuery = mock(Query.class);
        Query fuzzyQuery = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(anyString(), eq(WineJpaEntity.class)))
                .thenReturn(prefixQuery, containmentQuery, fuzzyQuery);
        when(prefixQuery.getResultList()).thenReturn(List.of());
        when(containmentQuery.getResultList()).thenReturn(List.of());
        when(fuzzyQuery.getResultList()).thenReturn(List.of());

        repository.searchAdvanced("cabernet", "red", null, "Argentina", "Mendoza", "Merlot",
                PageRequest.of(0, 20), false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, times(3)).createNativeQuery(sqlCaptor.capture(), eq(WineJpaEntity.class));
        String filters = "catalog.wine_type = CAST(:wineType AS VARCHAR) AND catalog.country_id = ANY(ARRAY("
                + "SELECT c_filter.id FROM countries c_filter WHERE LOWER(c_filter.name) = LOWER(CAST(:country AS "
                + "VARCHAR)))) AND catalog.region_id = ANY(ARRAY(SELECT r_filter.id FROM regions r_filter WHERE "
                + "LOWER(r_filter.name) = LOWER(CAST(:region AS VARCHAR)))) AND catalog.grapes_text ILIKE "
                + "CONCAT('%', CAST(:grapeVariety AS VARCHAR), '%')";
        assertThat(sqlCaptor.getAllValues().get(0))
                .contains("FROM wine_catalog_filter_search catalog WHERE catalog.is_active = true "
                        + "AND catalog.search_vector @@ to_tsquery('simple', CAST(:searchTsQuery AS TEXT)) AND "
                        + filters + " LIMIT :candidateLimit")
                .contains("LOWER(catalog.name) = LOWER(CAST(:searchText AS TEXT))")
                .contains("(SELECT catalog.wine_id, catalog.name, 2.0 + ts_rank_cd(")
                .contains("page AS (SELECT wine_id, MAX(name) AS name, MAX(relevance) AS relevance FROM "
                        + "candidate_scores GROUP BY wine_id ORDER BY relevance DESC, name ASC, wine_id ASC "
                        + "OFFSET :pageOffset LIMIT :pageLimit) SELECT w.* FROM page JOIN wines w")
                .doesNotContain("JOIN wines w ON w.id = catalog.wine_id");
        verify(prefixQuery).setParameter("pageOffset", 0);
        verify(prefixQuery).setParameter("pageLimit", 21);
        assertThat(sqlCaptor.getAllValues().get(1))
                .contains("FROM wine_catalog_filter_search catalog WHERE catalog.is_active = true AND "
                        + "catalog.search_text LIKE CAST(:containedWord0 AS TEXT) AND " + filters);
        assertThat(sqlCaptor.getAllValues().get(2))
                .contains("catalog.name % CAST(:searchText AS TEXT) AND " + filters)
                .contains("ORDER BY relevance DESC, catalog.wine_id ASC LIMIT :candidateLimit")
                .contains("(SELECT catalog.wine_id, catalog.name, 0.75 + similarity(wy.name,")
                .contains("JOIN wine_catalog_filter_search catalog ON catalog.winery_id = wy.id "
                        + "WHERE wy.is_active = true AND catalog.is_active = true AND wy.name % "
                        + "CAST(:searchText AS TEXT) AND " + filters)
                .doesNotContain("CAST(w.grapes AS TEXT) ILIKE");
        verify(prefixQuery).setParameter("wineType", "RED");
        verify(prefixQuery).setParameter("country", "Argentina");
        verify(prefixQuery).setParameter("region", "Mendoza");
        verify(prefixQuery).setParameter("grapeVariety", "Merlot");
        verify(prefixQuery).setHint("jakarta.persistence.query.timeout", 2_000);
    }

    @Test
    void staffFilteredFuzzyTierKeepsSeparateActiveAndInactiveBranches() {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(anyString(), eq(WineJpaEntity.class))).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of());
        UUID wineryId = UUID.randomUUID();

        repository.searchAdvanced("Qzxwv", null, wineryId, null, null, null, PageRequest.of(0, 20), true);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, times(3)).createNativeQuery(sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getAllValues().get(0)).contains("WHERE TRUE AND catalog.search_vector @@")
                .contains("catalog.winery_id = :wineryId");
        assertThat(sqlCaptor.getAllValues().get(2))
                .contains("WHERE catalog.is_active = true AND catalog.name %")
                .contains("WHERE catalog.is_active = false AND catalog.name %")
                .contains("WHERE wy.is_active = true AND wy.name %")
                .contains("WHERE wy.is_active = false AND wy.name %")
                .doesNotContain("w.winery_id = :wineryId");
    }

    @Test
    void grapePageWalksTheGrapeIndexAndHydratesInPageOrder() {
        EntityManager entityManager = mock(EntityManager.class);
        Query walkQuery = mock(Query.class);
        Query hydrateQuery = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        when(entityManager.createNativeQuery(anyString())).thenReturn(walkQuery);
        when(walkQuery.getResultList()).thenReturn(List.<Object[]>of(
                new Object[]{first, false}, new Object[]{second, false}));
        when(entityManager.createNativeQuery(anyString(), eq(WineJpaEntity.class))).thenReturn(hydrateQuery);
        when(hydrateQuery.getResultList()).thenReturn(List.of(entity(second, "Zeta"), entity(first, "Alfa")));

        var page = repository.searchAdvanced(null, null, null, "Argentina", null, "Malbec",
                PageRequest.of(1, 20), false);

        assertThat(page.content()).extracting(wine -> wine.getId()).containsExactly(first, second);
        assertThat(page.totalElements()).isEqualTo(22);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(sqlCaptor.capture());
        assertThat(sqlCaptor.getValue())
                .contains("FROM wine_grape_keys k WHERE k.grape_key ILIKE CONCAT('%', "
                        + "CAST(:grapeVariety AS VARCHAR), '%')")
                .contains("(g.is_active = true AND g.country_id = ANY(ARRAY(")
                .contains("FROM wine_grape_search g WHERE g.grape_key = k.grape_key "
                        + "ORDER BY g.name, g.wine_id LIMIT :walkLimit")
                .doesNotContain("grapes_text");
        verify(walkQuery).setParameter("walkLimit", 4_000);
        verify(walkQuery).setParameter("pageWindow", 41);
        verify(walkQuery).setParameter("keyWindow", 42);
        verify(walkQuery).setParameter("pageOffset", 20);
        verify(walkQuery).setParameter("pageLimit", 21);
        verify(hydrateQuery).setParameter("pageIds", List.of(first, second));
    }

    @Test
    void grapePageWithNoMatchingKeyIsEmptyWithoutHydrating() {
        EntityManager entityManager = mock(EntityManager.class);
        Query walkQuery = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(anyString())).thenReturn(walkQuery);
        when(walkQuery.getResultList()).thenReturn(List.<Object[]>of(new Object[]{null, false}));

        var page = repository.searchAdvanced(null, null, null, null, null, "Qzxwv", PageRequest.of(0, 20), true);

        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
        verify(entityManager, times(0)).createNativeQuery(anyString(), eq(WineJpaEntity.class));
    }

    @Test
    void sparseGrapeFiltersFallBackToTheExactFilteredSet() {
        EntityManager entityManager = mock(EntityManager.class);
        Query walkQuery = mock(Query.class);
        Query exactQuery = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(anyString())).thenReturn(walkQuery);
        when(walkQuery.getResultList()).thenReturn(List.<Object[]>of(new Object[]{UUID.randomUUID(), true}));
        when(entityManager.createNativeQuery(anyString(), eq(WineJpaEntity.class))).thenReturn(exactQuery);
        when(exactQuery.getResultList()).thenReturn(List.of());

        repository.searchAdvanced(null, null, null, null, "Mendoza", "Merlot", PageRequest.of(0, 20), false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getValue())
                .contains("FROM wine_catalog_filter_search catalog WHERE catalog.is_active = true "
                        + "AND catalog.region_id = ANY(ARRAY(")
                .contains("catalog.grapes_text ILIKE CONCAT('%', CAST(:grapeVariety AS VARCHAR), '%')")
                .contains("ORDER BY catalog.name, catalog.wine_id OFFSET :pageOffset LIMIT :pageLimit");
        verify(exactQuery).setParameter("grapeVariety", "Merlot");
        verify(exactQuery).setParameter("region", "Mendoza");
    }

    /** Filters without a grape keep their wine composite-index statement (#531 leaves it unchanged). */
    @Test
    void filtersWithoutGrapeKeepTheWineNameOrderedStatement() {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(anyString(), eq(WineJpaEntity.class))).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of());

        repository.searchAdvanced(null, null, null, "Argentina", null, null, PageRequest.of(0, 20), false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(sqlCaptor.capture(), eq(WineJpaEntity.class));
        assertThat(sqlCaptor.getValue()).isEqualTo("WITH page_ids AS (SELECT w.id, w.name FROM wines w "
                + "WHERE w.is_active = true AND w.country_id IN (SELECT c_filter.id FROM countries c_filter "
                + "WHERE LOWER(c_filter.name) = LOWER(CAST(:country AS VARCHAR))) ORDER BY w.name ASC "
                + "OFFSET :pageOffset LIMIT :pageLimit) SELECT w.* FROM page_ids page "
                + "JOIN wines w ON w.id = page.id ORDER BY page.name ASC");
    }

    private static WineJpaEntity entity(UUID id, String name) {
        WineJpaEntity entity = new WineJpaEntity();
        ReflectionTestUtils.setField(entity, "id", id);
        ReflectionTestUtils.setField(entity, "name", name);
        ReflectionTestUtils.setField(entity, "wineType", WineJpaEntity.WineTypeEnum.RED);
        return entity;
    }

    /** The public catalog's fuzzy statement as it was before the staff tier split (#519); it must not change. */
    private static final String PUBLIC_FUZZY_SQL = "WITH candidate_scores AS ((SELECT w.id AS wine_id, "
            + "1.0 + similarity(w.name, CAST(:searchText AS TEXT)) AS relevance FROM wines w "
            + "WHERE w.is_active = true AND w.name % CAST(:searchText AS TEXT)  "
            + "ORDER BY relevance DESC, w.id ASC LIMIT :candidateLimit) UNION ALL (SELECT w.id AS wine_id, "
            + "0.75 + similarity(wy.name, CAST(:searchText AS TEXT)) AS relevance FROM wineries wy "
            + "JOIN wines w ON w.winery_id = wy.id WHERE wy.is_active = true AND w.is_active = true "
            + "AND wy.name % CAST(:searchText AS TEXT)  ORDER BY relevance DESC, w.id ASC LIMIT :candidateLimit)), "
            + "candidate_ids AS (SELECT wine_id, MAX(relevance) AS relevance FROM candidate_scores GROUP BY wine_id) "
            + "SELECT w.* FROM candidate_ids candidates JOIN wines w ON w.id = candidates.wine_id "
            + "WHERE w.is_active = true ORDER BY candidates.relevance DESC, w.name ASC, w.id ASC";

    /** Runs a search no identity tier matches, so the typo-tolerant tier runs, and returns its statement. */
    private static String fuzzyStatement(boolean includeInactive) {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        WineSearchNativeRepository repository = new WineSearchNativeRepository();
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
        when(entityManager.createNativeQuery(anyString(), eq(WineJpaEntity.class))).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of());

        repository.searchAdvanced("Qzxwv plumbus", null, null, null, null, null,
                PageRequest.of(0, 20), includeInactive);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, times(3)).createNativeQuery(sqlCaptor.capture(), eq(WineJpaEntity.class));
        return sqlCaptor.getAllValues().get(2);
    }
}
