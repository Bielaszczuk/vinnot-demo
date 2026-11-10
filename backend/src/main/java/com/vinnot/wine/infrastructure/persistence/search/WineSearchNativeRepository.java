package com.vinnot.wine.infrastructure.persistence.search;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.infrastructure.persistence.entity.WineJpaEntity;
import com.vinnot.wine.infrastructure.persistence.mapper.WinePersistenceMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.Query;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Executes complex native SQL searches for wines.
 * Encapsulates CTE-based multi-word search, trigram fuzzy matching, and dynamic filter composition.
 * Extracted from WinePersistenceAdapter to honour the Single Responsibility Principle.
 */
@Repository
public class WineSearchNativeRepository {

    private static final int LABEL_PREFILTER_MULTIPLIER = 5;
    private static final int MIN_LABEL_PREFILTER_SIZE = 200;
    private static final int LABEL_QUERY_TIMEOUT_MS = 1_500;
    private static final int LABEL_INDEXED_QUERY_TIMEOUT_MS = 750;
    private static final int CATALOG_PREFIX_QUERY_TIMEOUT_MS = 2_000;
    private static final int CATALOG_FALLBACK_QUERY_TIMEOUT_MS = 3_000;
    private static final int MIN_CATALOG_CANDIDATE_LIMIT = 500;
    private static final int MAX_SUBSTRING_COMPATIBILITY_LENGTH = 3;
    /** Read model with the catalog search text and the filter attributes, intersected in one GIN index (V86). */
    private static final String FILTERED_CATALOG = "wine_catalog_filter_search";
    /** Entries walked per grape key before a sparse filter combination falls back to the exact filtered set. */
    private static final int GRAPE_WALK_LIMIT = 4_000;

    private enum CatalogSearchTier {
        PREFIX,
        CONTAINMENT,
        FUZZY
    }

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Advanced search matching each word independently across wine name and winery name.
     * Wine and winery identity text use the synchronized catalog-search read model;
     * typo-tolerant branches use trigram matching.
     * Falls back to a simple paginated query when no filters are supplied.
     * Inactive wines (and wines of inactive wineries) are only returned when
     * {@code includeInactive} is set, which is reserved for staff listings.
     */
    public PageResult<Wine> searchAdvanced(String searchTerm, String wineType, UUID wineryId,
                                           String country, String region,
                                           String grapeVariety, Pageable pageable,
                                           boolean includeInactive) {

        String[] words = parseSearchWords(searchTerm);
        boolean hasTextSearch = Objects.nonNull(words);
        boolean hasFilters = hasTextSearch
                || (Objects.nonNull(wineType) && !wineType.isBlank())
                || Objects.nonNull(wineryId)
                || (Objects.nonNull(country) && !country.isBlank())
                || (Objects.nonNull(region) && !region.isBlank())
                || (Objects.nonNull(grapeVariety) && !grapeVariety.isBlank());

        if (!hasFilters) {
            return searchAll(pageable, includeInactive);
        }

        if (!hasTextSearch) {
            return searchWithFiltersOnly(wineType, wineryId, country, region, grapeVariety,
                    pageable, includeInactive);
        }

        return searchWithTextAndFilters(
                words, wineType, wineryId, country, region, grapeVariety, pageable,
                includeInactive);
    }

    /**
     * Fuzzy match search using field-agnostic pg_trgm similarity scoring.
     * A label term can describe either the public brand/winery or the product
     * designation, so every term is compared with both catalog fields.
     * Falls back to visual-cue filtering when no identity terms are available.
     */
    @SuppressWarnings("unchecked")
    public List<Wine> findByFuzzyMatch(List<String> identityTerms, Integer vintage,
                                       String grapeVariety, String wineType, int limit) {
        List<String> terms = Objects.requireNonNullElse(identityTerms, List.<String>of())
                .stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(term -> !term.isBlank())
                .distinct()
                .toList();
        if (terms.isEmpty()) {
            return findByVisualCues(grapeVariety, wineType, vintage, limit);
        }

        Map<String, Object> params = new HashMap<>();
        List<String> wineSimilarities = new ArrayList<>();
        List<String> winerySimilarities = new ArrayList<>();
        List<String> candidateBranches = new ArrayList<>();
        for (int index = 0; index < terms.size(); index++) {
            String parameter = "identityTerm" + index;
            String castParameter = "CAST(:" + parameter + " AS TEXT)";
            String wineSimilarity =
                    "COALESCE(similarity(w.name, " + castParameter + "), 0)";
            String winerySimilarity =
                    "COALESCE(similarity(wy.name, " + castParameter + "), 0)";
            wineSimilarities.add(wineSimilarity);
            winerySimilarities.add(winerySimilarity);
            candidateBranches.add(
                    "(SELECT w.id AS wine_id, " + wineSimilarity
                            + " AS identity_score FROM wines w "
                            + "WHERE w.is_active = true AND (w.name % "
                            + castParameter + " OR w.name ILIKE CONCAT('%', "
                            + castParameter + ", '%')) "
                            + "ORDER BY identity_score DESC, w.id ASC "
                            + "LIMIT :branchLimit)");
            candidateBranches.add(
                    "(SELECT w.id AS wine_id, " + winerySimilarity
                            + " AS identity_score FROM wineries wy "
                            + "JOIN wines w ON w.winery_id = wy.id "
                            + "WHERE wy.is_active = true AND w.is_active = true "
                            + "AND (wy.name % " + castParameter
                            + " OR wy.name ILIKE CONCAT('%', "
                            + castParameter + ", '%')) "
                            + "ORDER BY identity_score DESC, w.id ASC "
                            + "LIMIT :branchLimit)");
            params.put(parameter, terms.get(index));
        }

        StringBuilder scoreParts = new StringBuilder()
                .append("GREATEST(")
                .append(String.join(", ", wineSimilarities))
                .append(") * 0.55 + GREATEST(")
                .append(String.join(", ", winerySimilarities))
                .append(") * 0.35");
        if (Objects.nonNull(vintage)) {
            scoreParts.append(
                    " + CASE WHEN w.vintage = :vintage THEN 0.05 ELSE 0.0 END");
            params.put("vintage", vintage);
        }
        if (Objects.nonNull(grapeVariety) && !grapeVariety.isBlank()) {
            scoreParts.append(" + CASE WHEN CAST(w.grapes AS TEXT) ILIKE CONCAT('%', "
                    + "CAST(:grapeVariety AS VARCHAR), '%') THEN 0.05 ELSE 0.0 END");
            params.put("grapeVariety", grapeVariety);
        }
        if (Objects.nonNull(wineType) && !wineType.isBlank()) {
            scoreParts.append(
                    " + CASE WHEN w.wine_type = CAST(:wineType AS VARCHAR) "
                            + "THEN 0.03 ELSE 0.0 END");
            params.put("wineType", wineType.toUpperCase(Locale.ROOT));
        }

        String sql = "WITH candidate_scores AS ("
                + String.join(" UNION ALL ", candidateBranches)
                + "), candidate_ids AS ("
                + "SELECT wine_id, SUM(identity_score) AS preliminary_score "
                + "FROM candidate_scores GROUP BY wine_id "
                + "ORDER BY preliminary_score DESC, wine_id ASC LIMIT :prefilterLimit"
                + ") SELECT w.*, (" + scoreParts + ") AS match_score "
                + "FROM candidate_ids candidates "
                + "JOIN wines w ON w.id = candidates.wine_id "
                + "LEFT JOIN wineries wy ON w.winery_id = wy.id "
                + "WHERE w.is_active = true "
                + "ORDER BY match_score DESC, w.id ASC "
                + "LIMIT :resultLimit";
        params.put("prefilterLimit", Math.max(
                limit * LABEL_PREFILTER_MULTIPLIER,
                MIN_LABEL_PREFILTER_SIZE));
        params.put("branchLimit", limit);
        params.put("resultLimit", limit);

        Query query = entityManager.createNativeQuery(sql, WineJpaEntity.class);
        params.forEach(query::setParameter);
        query.setHint("jakarta.persistence.query.timeout", LABEL_QUERY_TIMEOUT_MS);
        List<WineJpaEntity> results = query.getResultList();
        return results.stream().map(WinePersistenceMapper::toDomain).toList();
    }

    /**
     * Executes the low-latency fallback using only indexed predicates. Domain
     * scoring is intentionally left to the application matcher.
     */
    @SuppressWarnings("unchecked")
    public List<Wine> findByIndexedIdentity(List<String> identityTerms, int limit) {
        List<String> terms = Objects.requireNonNullElse(identityTerms, List.<String>of())
                .stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(term -> !term.isBlank())
                .distinct()
                .toList();
        if (terms.isEmpty()) {
            return List.of();
        }

        Map<String, Object> params = new HashMap<>();
        List<String> candidateBranches = new ArrayList<>();
        for (int index = 0; index < terms.size(); index++) {
            String parameter = "indexedIdentity" + index;
            String castParameter = "CAST(:" + parameter + " AS TEXT)";
            String fullTextParameter = "CAST(:" + parameter + "Tokens AS TEXT)";
            // Rank before truncating so heap order cannot discard a concise
            // identity among many product variants. Final confidence is domain-owned.
            candidateBranches.add(
                    "(SELECT w.id AS wine_id, "
                            + "1.0 + ts_rank_cd(catalog.search_vector, "
                            + "plainto_tsquery('simple', " + fullTextParameter + "), 2) "
                            + "AS identity_score FROM wine_catalog_search catalog "
                            + "JOIN wines w ON w.id = catalog.wine_id "
                            + "WHERE w.is_active = true AND catalog.search_vector "
                            + "@@ plainto_tsquery('simple', " + fullTextParameter + ") "
                            + "ORDER BY identity_score DESC, w.id ASC "
                            + "LIMIT :indexedBranchLimit)");
            candidateBranches.add(
                    "(SELECT w.id AS wine_id, 0.8 AS identity_score FROM wineries wy "
                            + "JOIN wines w ON w.winery_id = wy.id "
                            + "WHERE wy.is_active = true AND w.is_active = true "
                            + "AND wy.name % " + castParameter + " "
                            + "ORDER BY similarity(wy.name, " + castParameter + ") DESC, w.id ASC "
                            + "LIMIT :indexedBranchLimit)");
            params.put(parameter, terms.get(index));
            // OCR can join product words with punctuation. PostgreSQL treats a
            // hyphenated word/host name as an extra required lexeme; catalog text
            // may use spaces instead. Preserve scripts/accents and all identity tokens.
            params.put(parameter + "Tokens", terms.get(index)
                    .replaceAll("(?<=[\\p{L}\\p{N}])[.\\p{Pd}](?=[\\p{L}\\p{N}])", " "));
        }

        String sql = "WITH candidate_scores AS ("
                + String.join(" UNION ALL ", candidateBranches)
                + "), candidate_ids AS ("
                + "SELECT wine_id, MAX(identity_score) AS identity_score "
                + "FROM candidate_scores GROUP BY wine_id "
                + "ORDER BY identity_score DESC, wine_id ASC "
                + "LIMIT :indexedResultLimit"
                + ") SELECT w.* FROM candidate_ids candidates "
                + "JOIN wines w ON w.id = candidates.wine_id "
                + "WHERE w.is_active = true "
                + "ORDER BY candidates.identity_score DESC, w.id ASC";
        params.put("indexedBranchLimit", limit);
        params.put("indexedResultLimit", limit);

        Query query = entityManager.createNativeQuery(
                sql, WineJpaEntity.class);
        params.forEach(query::setParameter);
        query.setHint(
                "jakarta.persistence.query.timeout", LABEL_INDEXED_QUERY_TIMEOUT_MS);
        List<WineJpaEntity> results = query.getResultList();
        return results.stream().map(WinePersistenceMapper::toDomain).toList();
    }

    /**
     * Retrieves structured commercial identifiers through ordered token
     * containment. Parameters are normalized by the application layer and are
     * bound values; wildcard placement never interpolates user input into SQL.
     */
    @SuppressWarnings("unchecked")
    public List<Wine> findByCommercialIdentity(
            List<String> identityTerms, Integer vintage,
            String grapeVariety, String wineType, int limit) {
        if (identityTerms.isEmpty()) {
            return List.of();
        }
        Map<String, Object> params = new HashMap<>();
        List<String> predicates = new ArrayList<>();
        List<String> identityScores = new ArrayList<>();
        for (int index = 0; index < identityTerms.size(); index++) {
            String parameter = "commercialIdentity" + index;
            String predicate = "w.name ILIKE CAST(:" + parameter + " AS TEXT)";
            predicates.add(predicate);
            identityScores.add("CASE WHEN " + predicate + " THEN 1.0 ELSE 0.0 END");
            String flexibleTerm = identityTerms.get(index).toLowerCase(Locale.ROOT)
                    .replace(" ", "%");
            params.put(parameter, "%" + flexibleTerm + "%");
        }
        StringBuilder score = new StringBuilder("GREATEST(")
                .append(String.join(", ", identityScores))
                .append(")");
        if (Objects.nonNull(vintage)) {
            score.append(" + CASE WHEN w.vintage = :commercialVintage "
                    + "THEN 0.05 ELSE 0.0 END");
            params.put("commercialVintage", vintage);
        }
        if (Objects.nonNull(grapeVariety) && !grapeVariety.isBlank()) {
            score.append(" + CASE WHEN CAST(w.grapes AS TEXT) ILIKE CONCAT('%', "
                    + "CAST(:commercialGrape AS VARCHAR), '%') THEN 0.05 ELSE 0.0 END");
            params.put("commercialGrape", grapeVariety);
        }
        if (Objects.nonNull(wineType) && !wineType.isBlank()) {
            score.append(" + CASE WHEN w.wine_type = CAST(:commercialType AS VARCHAR) "
                    + "THEN 0.03 ELSE 0.0 END");
            params.put("commercialType", wineType.toUpperCase(Locale.ROOT));
        }
        String sql = "SELECT w.* FROM wines w WHERE w.is_active = true AND ("
                + String.join(" OR ", predicates) + ") ORDER BY " + score
                + " DESC, w.name ASC, w.id ASC LIMIT :commercialLimit";
        params.put("commercialLimit", limit);
        Query query = entityManager.createNativeQuery(
                sql, WineJpaEntity.class);
        params.forEach(query::setParameter);
        query.setHint("jakarta.persistence.query.timeout", LABEL_QUERY_TIMEOUT_MS);
        List<WineJpaEntity> results = query.getResultList();
        return results.stream().map(WinePersistenceMapper::toDomain).toList();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private static String winePredicate(boolean includeInactive) {
        return activePredicate("w", includeInactive);
    }

    private static String activePredicate(String alias, boolean includeInactive) {
        return includeInactive ? "TRUE" : alias + ".is_active = true";
    }

    private static boolean isPresent(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    private static boolean hasWineFilters(String wineType, UUID wineryId, String country, String region,
                                          String grapeVariety) {
        return isPresent(wineType) || Objects.nonNull(wineryId) || isPresent(country) || isPresent(region)
                || isPresent(grapeVariety);
    }

    /**
     * Wines in name order. Each read follows a partial name index, so a page never sorts the catalog: the public
     * catalog reads active wines; the staff listing merges the first {@code pageWindow} active and inactive wines
     * (V61), because no index covers every wine.
     */
    private static String pageRowsByName(boolean includeInactive) {
        String active = "SELECT w.id, w.name FROM wines w WHERE w.is_active = true";
        if (!includeInactive) {
            return active;
        }
        return "(" + active + " ORDER BY w.name ASC LIMIT :pageWindow) UNION ALL "
                + "(SELECT w.id, w.name FROM wines w WHERE w.is_active = false "
                + "ORDER BY w.name ASC LIMIT :pageWindow)";
    }

    private PageResult<Wine> searchAll(Pageable pageable, boolean includeInactive) {
        long estimatedCount = estimateWinesCount(includeInactive);
        if (estimatedCount == 0) {
            return PageResult.empty();
        }
        int offset = Math.toIntExact(pageable.getOffset());
        int limit = pageable.getPageSize();
        Query dataQuery = entityManager.createNativeQuery(
                "WITH page_ids AS (SELECT page_rows.id, page_rows.name FROM ("
                        + pageRowsByName(includeInactive)
                        + ") page_rows ORDER BY page_rows.name ASC "
                        + "OFFSET :pageOffset LIMIT :pageLimit) "
                        + "SELECT w.* FROM page_ids page JOIN wines w ON w.id = page.id "
                        + "ORDER BY page.name ASC",
                WineJpaEntity.class);
        if (includeInactive) {
            dataQuery.setParameter("pageWindow", offset + limit);
        }
        dataQuery.setParameter("pageOffset", offset);
        dataQuery.setParameter("pageLimit", limit);
        dataQuery.setHint(
                "jakarta.persistence.query.timeout", CATALOG_PREFIX_QUERY_TIMEOUT_MS);
        @SuppressWarnings("unchecked")
        List<WineJpaEntity> results = dataQuery.getResultList();
        return PageMapper.toPageResult(
                new PageImpl<>(results, pageable, estimatedCount).map(WinePersistenceMapper::toDomain));
    }

    @SuppressWarnings("unchecked")
    private PageResult<Wine> searchWithFiltersOnly(String wineType, UUID wineryId,
                                                    String country, String region,
                                                    String grapeVariety, Pageable pageable,
                                                    boolean includeInactive) {
        if (isPresent(grapeVariety)) {
            return searchGrapePage(wineType, wineryId, country, region, grapeVariety, pageable,
                    includeInactive);
        }
        Map<String, Object> params = new HashMap<>();
        String filters = buildWineFilterPredicates(
                wineType, wineryId, country, region, grapeVariety, params);
        params.put("pageOffset", Math.toIntExact(pageable.getOffset()));
        params.put("pageLimit", pageable.getPageSize() + 1);

        Query dataQuery = entityManager.createNativeQuery(
                "WITH page_ids AS ("
                        + "SELECT w.id, w.name FROM wines w "
                        + "WHERE " + winePredicate(includeInactive) + filters
                        + " ORDER BY w.name ASC OFFSET :pageOffset LIMIT :pageLimit"
                        + ") SELECT w.* FROM page_ids page "
                        + "JOIN wines w ON w.id = page.id ORDER BY page.name ASC",
                WineJpaEntity.class);
        params.forEach(dataQuery::setParameter);
        dataQuery.setHint(
                "jakarta.persistence.query.timeout", CATALOG_PREFIX_QUERY_TIMEOUT_MS);
        List<WineJpaEntity> results = dataQuery.getResultList();
        return toEstimatedPageResult(results, pageable);
    }

    /**
     * A grape filter without text, in name order. Each grape key matching the filter is walked in name order
     * through {@code idx_wine_grape_search_name_page} (V86), at most {@link #GRAPE_WALK_LIMIT} entries per key,
     * checking the other filters on the index entry. The first {@code offset + size + 1} matches of every key
     * contain the page, so a common grape reads a page's worth of entries instead of every wine of the grape.
     * When a key reaches the walk limit with fewer matches (the other filters are sparse within the grape), the
     * page comes from the exact filtered set instead, which is then small.
     */
    @SuppressWarnings("unchecked")
    private PageResult<Wine> searchGrapePage(String wineType, UUID wineryId, String country, String region,
                                             String grapeVariety, Pageable pageable, boolean includeInactive) {
        Map<String, Object> params = new HashMap<>();
        String filters = buildFilterPredicates(
                "g", wineType, wineryId, country, region, null, params);
        int pageWindow = Math.toIntExact(pageable.getOffset()) + pageable.getPageSize() + 1;
        params.put("grapeVariety", grapeVariety);
        params.put("walkLimit", GRAPE_WALK_LIMIT);
        params.put("pageWindow", pageWindow);
        params.put("keyWindow", pageWindow + 1);
        params.put("pageOffset", Math.toIntExact(pageable.getOffset()));
        params.put("pageLimit", pageable.getPageSize() + 1);

        Query walkQuery = entityManager.createNativeQuery(
                "WITH grape_keys AS MATERIALIZED (SELECT k.grape_key FROM wine_grape_keys k "
                        + "WHERE k.grape_key ILIKE CONCAT('%', CAST(:grapeVariety AS VARCHAR), '%')), "
                        + "walked AS (SELECT k.grape_key, walk.wine_id, walk.name, walk.passes, walk.position "
                        + "FROM grape_keys k CROSS JOIN LATERAL (SELECT scanned.wine_id, scanned.name, "
                        + "scanned.passes, scanned.position FROM (SELECT g.wine_id, g.name, ("
                        + activePredicate("g", includeInactive) + filters
                        + ") AS passes, row_number() OVER (ORDER BY g.name, g.wine_id) AS position "
                        + "FROM wine_grape_search g WHERE g.grape_key = k.grape_key "
                        + "ORDER BY g.name, g.wine_id LIMIT :walkLimit) scanned "
                        + "WHERE scanned.passes OR scanned.position = :walkLimit LIMIT :keyWindow) walk), "
                        + "key_state AS (SELECT bool_or(reached_limit AND matched < :pageWindow) AS incomplete "
                        + "FROM (SELECT count(*) FILTER (WHERE passes) AS matched, "
                        + "bool_or(position = :walkLimit) AS reached_limit FROM walked GROUP BY grape_key) keys), "
                        + "page AS (SELECT wine_id, MIN(name) AS name FROM walked WHERE passes GROUP BY wine_id "
                        + "ORDER BY name, wine_id OFFSET :pageOffset LIMIT :pageLimit) "
                        + "SELECT page.wine_id, COALESCE(key_state.incomplete, false) AS incomplete "
                        + "FROM key_state LEFT JOIN page ON true ORDER BY page.name, page.wine_id");
        params.forEach(walkQuery::setParameter);
        walkQuery.setHint("jakarta.persistence.query.timeout", CATALOG_PREFIX_QUERY_TIMEOUT_MS);
        List<Object[]> rows = walkQuery.getResultList();
        if (Boolean.TRUE.equals(rows.getFirst()[1])) {
            return searchExactFilteredGrapePage(wineType, wineryId, country, region, grapeVariety, pageable,
                    includeInactive);
        }
        List<UUID> pageIds = rows.stream()
                .map(row -> (UUID) row[0])
                .filter(Objects::nonNull)
                .toList();
        return toEstimatedPageResult(hydrateInOrder(pageIds), pageable);
    }

    @SuppressWarnings("unchecked")
    private PageResult<Wine> searchExactFilteredGrapePage(String wineType, UUID wineryId, String country,
                                                          String region, String grapeVariety, Pageable pageable,
                                                          boolean includeInactive) {
        Map<String, Object> params = new HashMap<>();
        String filters = buildFilterPredicates(
                "catalog", wineType, wineryId, country, region, grapeVariety, params);
        params.put("pageOffset", Math.toIntExact(pageable.getOffset()));
        params.put("pageLimit", pageable.getPageSize() + 1);
        Query dataQuery = entityManager.createNativeQuery(
                "WITH page_ids AS (SELECT catalog.wine_id, catalog.name FROM " + FILTERED_CATALOG + " catalog "
                        + "WHERE " + activePredicate("catalog", includeInactive) + filters
                        + " ORDER BY catalog.name, catalog.wine_id OFFSET :pageOffset LIMIT :pageLimit) "
                        + "SELECT w.* FROM page_ids page JOIN wines w ON w.id = page.wine_id "
                        + "ORDER BY page.name, page.wine_id",
                WineJpaEntity.class);
        params.forEach(dataQuery::setParameter);
        dataQuery.setHint("jakarta.persistence.query.timeout", CATALOG_PREFIX_QUERY_TIMEOUT_MS);
        List<WineJpaEntity> results = dataQuery.getResultList();
        return toEstimatedPageResult(results, pageable);
    }

    /** Loads the page's wines by primary key and keeps the order the page query decided. */
    @SuppressWarnings("unchecked")
    private List<WineJpaEntity> hydrateInOrder(List<UUID> pageIds) {
        if (pageIds.isEmpty()) {
            return List.of();
        }
        Query query = entityManager.createNativeQuery(
                "SELECT w.* FROM wines w WHERE w.id IN (:pageIds)", WineJpaEntity.class);
        query.setParameter("pageIds", pageIds);
        query.setHint("jakarta.persistence.query.timeout", CATALOG_PREFIX_QUERY_TIMEOUT_MS);
        Map<UUID, WineJpaEntity> byId = new HashMap<>();
        for (WineJpaEntity entity : (List<WineJpaEntity>) query.getResultList()) {
            byId.put(entity.getId(), entity);
        }
        return pageIds.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    @SuppressWarnings("unchecked")
    private PageResult<Wine> searchWithTextAndFilters(String[] words, String wineType, UUID wineryId,
                                                       String country, String region,
                                                       String grapeVariety, Pageable pageable,
                                                       boolean includeInactive) {
        List<CatalogSearchTier> identityTiers = containsShortSearchWord(words)
                ? List.of(CatalogSearchTier.CONTAINMENT, CatalogSearchTier.PREFIX)
                : List.of(CatalogSearchTier.PREFIX, CatalogSearchTier.CONTAINMENT);
        for (CatalogSearchTier tier : identityTiers) {
            PageResult<Wine> matches = executeCatalogSearchTier(
                    tier, words, wineType, wineryId,
                    country, region, grapeVariety, pageable, includeInactive);
            if (!matches.content().isEmpty()) {
                return matches;
            }
        }

        return executeCatalogSearchTier(
                CatalogSearchTier.FUZZY, words, wineType, wineryId,
                country, region, grapeVariety, pageable, includeInactive);
    }

    private boolean containsShortSearchWord(String[] words) {
        return Arrays.stream(words)
                .map(word -> word.toLowerCase(Locale.ROOT)
                        .replaceAll("[^\\p{Alnum}]+", ""))
                .anyMatch(word -> word.length() <= MAX_SUBSTRING_COMPATIBILITY_LENGTH);
    }

    /**
     * Executes one stage of the catalog search chain. Exact/prefix identity is
     * deliberately evaluated before substring and typo-tolerant fallbacks so a
     * selective query never pays for broad trigram branches.
     */
    @SuppressWarnings("unchecked")
    private PageResult<Wine> executeCatalogSearchTier(
            CatalogSearchTier tier, String[] words, String wineType, UUID wineryId,
            String country, String region, String grapeVariety, Pageable pageable,
            boolean includeInactive) {
        Map<String, Object> params = new HashMap<>();
        final String activeWine = winePredicate(includeInactive);
        String searchText = String.join(" ", words);
        String searchTsQuery = Arrays.stream(words)
                .map(this::toPrefixTsQuery)
                .collect(Collectors.joining(" & "));
        List<String> containmentPredicates = new ArrayList<>();
        if (tier == CatalogSearchTier.CONTAINMENT) {
            for (int index = 0; index < words.length; index++) {
                String parameter = "containedWord" + index;
                containmentPredicates.add(
                        "catalog.search_text LIKE CAST(:" + parameter + " AS TEXT)");
                params.put(parameter, "%" + words[index].toLowerCase(Locale.ROOT) + "%");
            }
        }
        int candidateLimit = Math.max(
                MIN_CATALOG_CANDIDATE_LIMIT,
                Math.toIntExact(pageable.getOffset()) + pageable.getPageSize() + 1);
        if (tier != CatalogSearchTier.CONTAINMENT) {
            params.put("searchText", searchText);
        }
        if (tier == CatalogSearchTier.PREFIX) {
            params.put("searchTsQuery", searchTsQuery);
        }
        params.put("candidateLimit", candidateLimit);
        boolean filtered = hasWineFilters(wineType, wineryId, country, region, grapeVariety);
        String candidateBranches;
        if (filtered) {
            String catalogFilters = buildFilterPredicates(
                    "catalog", wineType, wineryId, country, region, grapeVariety, params);
            candidateBranches = filteredCandidateBranches(
                    tier, containmentPredicates, catalogFilters, includeInactive);
        } else {
            candidateBranches = unfilteredCandidateBranches(
                    tier, containmentPredicates, activeWine, includeInactive);
        }

        Query dataQuery;
        if (filtered) {
            // Same order as the unfiltered statement: every candidate carries its wine's name (the read model's
            // name equals the wine's), so only the page's wines are loaded.
            dataQuery = entityManager.createNativeQuery("WITH candidate_scores AS ("
                    + candidateBranches
                    + "), page AS (SELECT wine_id, MAX(name) AS name, MAX(relevance) AS relevance "
                    + "FROM candidate_scores GROUP BY wine_id "
                    + "ORDER BY relevance DESC, name ASC, wine_id ASC OFFSET :pageOffset LIMIT :pageLimit) "
                    + "SELECT w.* FROM page JOIN wines w ON w.id = page.wine_id "
                    + "ORDER BY page.relevance DESC, page.name ASC, page.wine_id ASC",
                    WineJpaEntity.class);
            params.put("pageOffset", Math.toIntExact(pageable.getOffset()));
            params.put("pageLimit", pageable.getPageSize() + 1);
            params.forEach(dataQuery::setParameter);
        } else {
            String dataSql = "WITH candidate_scores AS ("
                    + candidateBranches
                    + "), candidate_ids AS ("
                    + "SELECT wine_id, MAX(relevance) AS relevance "
                    + "FROM candidate_scores GROUP BY wine_id"
                    + ") SELECT w.* "
                    + "FROM candidate_ids candidates JOIN wines w "
                    + "ON w.id = candidates.wine_id WHERE " + activeWine
                    + " ORDER BY candidates.relevance DESC, w.name ASC, w.id ASC";
            dataQuery = entityManager.createNativeQuery(dataSql, WineJpaEntity.class);
            params.forEach(dataQuery::setParameter);
            dataQuery.setFirstResult((int) pageable.getOffset());
            dataQuery.setMaxResults(pageable.getPageSize() + 1);
        }
        dataQuery.setHint(
                "jakarta.persistence.query.timeout",
                tier == CatalogSearchTier.PREFIX
                        ? CATALOG_PREFIX_QUERY_TIMEOUT_MS
                        : CATALOG_FALLBACK_QUERY_TIMEOUT_MS);
        List<WineJpaEntity> results = dataQuery.getResultList();
        return toEstimatedPageResult(results, pageable);
    }

    /** The tier's candidates when no filter applies: the statements are unchanged since before V86. */
    private static String unfilteredCandidateBranches(CatalogSearchTier tier, List<String> containmentPredicates,
                                                      String activeWine, boolean includeInactive) {
        String filters = "";
        return switch (tier) {
            case PREFIX -> "(SELECT w.id AS wine_id, "
                + "2.0 + ts_rank_cd(catalog.search_vector, "
                + "to_tsquery('simple', CAST(:searchTsQuery AS TEXT))) "
                + "+ CASE WHEN LOWER(w.name) = LOWER(CAST(:searchText AS TEXT)) "
                + "THEN 2.0 ELSE 0.0 END AS relevance "
                + "FROM wine_catalog_search catalog "
                + "JOIN wines w ON w.id = catalog.wine_id "
                + "WHERE " + activeWine + " "
                + "AND catalog.search_vector @@ "
                + "to_tsquery('simple', CAST(:searchTsQuery AS TEXT)) "
                + filters
                + " LIMIT :candidateLimit)";
            case CONTAINMENT -> "(SELECT w.id AS wine_id, 1.5 AS relevance "
                + "FROM wine_catalog_search catalog "
                + "JOIN wines w ON w.id = catalog.wine_id "
                + "WHERE " + activeWine + " AND "
                + String.join(" AND ", containmentPredicates)
                + filters
                + " LIMIT :candidateLimit)";
            case FUZZY -> fuzzyCandidateBranches(filters, includeInactive);
        };
    }

    /**
     * The tier's candidates when filters apply. Text and filters are conditions on one read model, so the
     * multicolumn GIN of V86 intersects them and only matching rows are read; the previous statements joined the
     * catalog to wines and let PostgreSQL walk every wine of a country or every text match (#531). Relevance is
     * computed from the same values: the read model's name equals the wine's name. The typo-tolerant tier reads
     * wine names from the read model too, and joins similar winery names to the read model's filtered rows.
     */
    private static String filteredCandidateBranches(CatalogSearchTier tier, List<String> containmentPredicates,
                                                    String catalogFilters, boolean includeInactive) {
        String activeCatalog = activePredicate("catalog", includeInactive);
        return switch (tier) {
            case PREFIX -> "(SELECT catalog.wine_id, catalog.name, "
                + "2.0 + ts_rank_cd(catalog.search_vector, "
                + "to_tsquery('simple', CAST(:searchTsQuery AS TEXT))) "
                + "+ CASE WHEN LOWER(catalog.name) = LOWER(CAST(:searchText AS TEXT)) "
                + "THEN 2.0 ELSE 0.0 END AS relevance "
                + "FROM " + FILTERED_CATALOG + " catalog "
                + "WHERE " + activeCatalog + " "
                + "AND catalog.search_vector @@ "
                + "to_tsquery('simple', CAST(:searchTsQuery AS TEXT))"
                + catalogFilters
                + " LIMIT :candidateLimit)";
            case CONTAINMENT -> "(SELECT catalog.wine_id, catalog.name, 1.5 AS relevance "
                + "FROM " + FILTERED_CATALOG + " catalog "
                + "WHERE " + activeCatalog + " AND "
                + String.join(" AND ", containmentPredicates)
                + catalogFilters
                + " LIMIT :candidateLimit)";
            case FUZZY -> includeInactive
                ? String.join(" UNION ALL ",
                    filteredFuzzyWineNameBranch("catalog.is_active = true", catalogFilters),
                    filteredFuzzyWineNameBranch("catalog.is_active = false", catalogFilters),
                    filteredFuzzyWineryNameBranch("wy.is_active = true", catalogFilters),
                    filteredFuzzyWineryNameBranch("wy.is_active = false", catalogFilters))
                : filteredFuzzyWineNameBranch("catalog.is_active = true", catalogFilters) + " UNION ALL "
                    + filteredFuzzyWineryNameBranch("wy.is_active = true AND catalog.is_active = true",
                        catalogFilters);
        };
    }

    private static String filteredFuzzyWineNameBranch(String scope, String catalogFilters) {
        return "(SELECT catalog.wine_id, catalog.name, "
                + "1.0 + similarity(catalog.name, CAST(:searchText AS TEXT)) "
                + "AS relevance FROM " + FILTERED_CATALOG + " catalog "
                + "WHERE " + scope + " "
                + "AND catalog.name % CAST(:searchText AS TEXT)"
                + catalogFilters
                + " ORDER BY relevance DESC, catalog.wine_id ASC LIMIT :candidateLimit)";
    }

    private static String filteredFuzzyWineryNameBranch(String scope, String catalogFilters) {
        return "(SELECT catalog.wine_id, catalog.name, "
                + "0.75 + similarity(wy.name, CAST(:searchText AS TEXT)) "
                + "AS relevance FROM wineries wy "
                + "JOIN " + FILTERED_CATALOG + " catalog ON catalog.winery_id = wy.id "
                + "WHERE " + scope + " "
                + "AND wy.name % CAST(:searchText AS TEXT)"
                + catalogFilters
                + " ORDER BY relevance DESC, catalog.wine_id ASC LIMIT :candidateLimit)";
    }

    /**
     * Typo-tolerant candidates by wine name and by winery name. Only partial trigram indexes exist (active rows
     * since V3, inactive rows since V85), so the staff search reads active and inactive rows in separate
     * branches, each served by its own index; one branch over every row would compare every name (#519).
     */
    private static String fuzzyCandidateBranches(String filters, boolean includeInactive) {
        if (!includeInactive) {
            return fuzzyWineNameBranch("w.is_active = true", filters) + " UNION ALL "
                    + fuzzyWineryNameBranch("wy.is_active = true AND w.is_active = true", filters);
        }
        return String.join(" UNION ALL ",
                fuzzyWineNameBranch("w.is_active = true", filters),
                fuzzyWineNameBranch("w.is_active = false", filters),
                fuzzyWineryNameBranch("wy.is_active = true", filters),
                fuzzyWineryNameBranch("wy.is_active = false", filters));
    }

    private static String fuzzyWineNameBranch(String scope, String filters) {
        return "(SELECT w.id AS wine_id, "
                + "1.0 + similarity(w.name, CAST(:searchText AS TEXT)) "
                + "AS relevance FROM wines w "
                + "WHERE " + scope + " "
                + "AND w.name % CAST(:searchText AS TEXT) "
                + filters
                + " ORDER BY relevance DESC, w.id ASC LIMIT :candidateLimit)";
    }

    private static String fuzzyWineryNameBranch(String scope, String filters) {
        return "(SELECT w.id AS wine_id, "
                + "0.75 + similarity(wy.name, CAST(:searchText AS TEXT)) "
                + "AS relevance FROM wineries wy "
                + "JOIN wines w ON w.winery_id = wy.id "
                + "WHERE " + scope + " "
                + "AND wy.name % CAST(:searchText AS TEXT) "
                + filters
                + " ORDER BY relevance DESC, w.id ASC LIMIT :candidateLimit)";
    }

    private PageResult<Wine> toEstimatedPageResult(List<WineJpaEntity> results, Pageable pageable) {
        boolean hasNextPage = results.size() > pageable.getPageSize();
        List<WineJpaEntity> pageResults = hasNextPage
                ? results.subList(0, pageable.getPageSize())
                : results;
        long total = pageable.getOffset() + pageResults.size() + (hasNextPage ? 1 : 0);

        return PageResult.of(
                pageResults.stream().map(WinePersistenceMapper::toDomain).toList(),
                pageable.getPageNumber(),
                pageable.getPageSize(),
                total);
    }

    /**
     * Produces predicates over the wine table only. Reference-data names are
     * resolved by indexed scalar subqueries so candidate selection can use the
     * wine composite indexes without hydrating and sorting full entities.
     */
    private String buildWineFilterPredicates(
            String wineType, UUID wineryId, String country, String region,
            String grapeVariety, Map<String, Object> params) {
        StringBuilder filters = new StringBuilder();
        if (Objects.nonNull(wineType) && !wineType.isBlank()) {
            filters.append(" AND w.wine_type = CAST(:wineType AS VARCHAR)");
            params.put("wineType", wineType.toUpperCase(Locale.ROOT));
        }
        if (Objects.nonNull(wineryId)) {
            filters.append(" AND w.winery_id = :wineryId");
            params.put("wineryId", wineryId);
        }
        if (Objects.nonNull(country) && !country.isBlank()) {
            filters.append(" AND w.country_id IN (SELECT c_filter.id FROM countries c_filter ")
                    .append("WHERE LOWER(c_filter.name) = LOWER(CAST(:country AS VARCHAR)))");
            params.put("country", country);
        }
        if (Objects.nonNull(region) && !region.isBlank()) {
            filters.append(" AND w.region_id IN (SELECT r_filter.id FROM regions r_filter ")
                    .append("WHERE LOWER(r_filter.name) = LOWER(CAST(:region AS VARCHAR)))");
            params.put("region", region);
        }
        if (Objects.nonNull(grapeVariety) && !grapeVariety.isBlank()) {
            filters.append(" AND CAST(w.grapes AS TEXT) ILIKE CONCAT('%', ")
                    .append("CAST(:grapeVariety AS VARCHAR), '%')");
            params.put("grapeVariety", grapeVariety);
        }
        return filters.toString();
    }

    /**
     * Filter predicates over a V86 read model ({@code catalog} for {@code wine_catalog_filter_search},
     * {@code g} for {@code wine_grape_search}), with the same parameters as the wine predicates. Country and region
     * names are resolved to ids before the scan ({@code ANY(ARRAY(...))} runs once), so they are index conditions.
     * A null grape leaves the grape out: the grape index matches grapes through its keys.
     */
    private static String buildFilterPredicates(
            String alias, String wineType, UUID wineryId, String country, String region,
            String grapeVariety, Map<String, Object> params) {
        StringBuilder filters = new StringBuilder();
        if (isPresent(wineType)) {
            filters.append(" AND ").append(alias).append(".wine_type = CAST(:wineType AS VARCHAR)");
            params.put("wineType", wineType.toUpperCase(Locale.ROOT));
        }
        if (Objects.nonNull(wineryId)) {
            filters.append(" AND ").append(alias).append(".winery_id = :wineryId");
            params.put("wineryId", wineryId);
        }
        if (isPresent(country)) {
            filters.append(" AND ").append(alias).append(".country_id = ANY(ARRAY(SELECT c_filter.id ")
                    .append("FROM countries c_filter ")
                    .append("WHERE LOWER(c_filter.name) = LOWER(CAST(:country AS VARCHAR))))");
            params.put("country", country);
        }
        if (isPresent(region)) {
            filters.append(" AND ").append(alias).append(".region_id = ANY(ARRAY(SELECT r_filter.id ")
                    .append("FROM regions r_filter ")
                    .append("WHERE LOWER(r_filter.name) = LOWER(CAST(:region AS VARCHAR))))");
            params.put("region", region);
        }
        if (isPresent(grapeVariety)) {
            filters.append(" AND ").append(alias).append(".grapes_text ILIKE CONCAT('%', ")
                    .append("CAST(:grapeVariety AS VARCHAR), '%')");
            params.put("grapeVariety", grapeVariety);
        }
        return filters.toString();
    }

    private List<Wine> findByVisualCues(String grapeVariety, String wineType, Integer vintage, int limit) {
        StringBuilder predicates = new StringBuilder("WHERE w.is_active = true");
        Map<String, Object> params = new HashMap<>();
        boolean hasFilter = false;

        if (Objects.nonNull(wineType) && !wineType.isBlank()) {
            predicates.append(" AND w.wine_type = CAST(:wineType AS VARCHAR)");
            params.put("wineType", wineType.toUpperCase());
            hasFilter = true;
        }
        if (Objects.nonNull(grapeVariety) && !grapeVariety.isBlank()) {
            predicates.append(" AND CAST(w.grapes AS TEXT) ILIKE CONCAT('%', CAST(:grapeVariety AS VARCHAR), '%')");
            params.put("grapeVariety", grapeVariety);
            hasFilter = true;
        }
        if (Objects.nonNull(vintage)) {
            predicates.append(" AND w.vintage = :vintage");
            params.put("vintage", vintage);
            hasFilter = true;
        }
        if (!hasFilter) {
            return List.of();
        }

        String sql = "WITH candidate_ids AS (SELECT w.id, w.rating_average, "
                + "w.rating_count FROM wines w " + predicates
                + " ORDER BY w.rating_average DESC NULLS LAST, "
                + "w.rating_count DESC NULLS LAST LIMIT :resultLimit) "
                + "SELECT w.* FROM candidate_ids candidates "
                + "JOIN wines w ON w.id = candidates.id "
                + "ORDER BY candidates.rating_average DESC NULLS LAST, "
                + "candidates.rating_count DESC NULLS LAST";
        params.put("resultLimit", limit);

        Query query = entityManager.createNativeQuery(sql, WineJpaEntity.class);
        params.forEach(query::setParameter);
        query.setHint("jakarta.persistence.query.timeout", LABEL_QUERY_TIMEOUT_MS);
        @SuppressWarnings("unchecked")
        List<WineJpaEntity> results = query.getResultList();
        return results.stream().map(WinePersistenceMapper::toDomain).toList();
    }

    private String[] parseSearchWords(String searchTerm) {
        if (Objects.isNull(searchTerm) || searchTerm.isBlank()) {
            return null;
        }
        String[] words = searchTerm.trim().split("\\s+");
        List<String> searchableWords = new ArrayList<>();
        for (String word : words) {
            String normalized = word.trim();
            if (!normalized.isBlank() && Objects.nonNull(toPrefixTsQuery(normalized))) {
                searchableWords.add(normalized);
            }
        }
        return searchableWords.isEmpty() ? null : searchableWords.toArray(String[]::new);
    }

    private String toPrefixTsQuery(String word) {
        String normalized = word
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{Alnum}]+", "");
        if (normalized.isBlank()) {
            return null;
        }
        return normalized + ":*";
    }

    private long estimateWinesCount(boolean includeInactive) {
        try {
            Query q = entityManager.createNativeQuery(
                    "SELECT reltuples::bigint FROM pg_class WHERE relname = 'wines'");
            long estimate = ((Number) q.getSingleResult()).longValue();
            if (estimate > 0) {
                return estimate;
            }
        } catch (Exception ignored) {
        }
        Query q = entityManager.createNativeQuery(
                includeInactive
                        ? "SELECT COUNT(*) FROM wines"
                        : "SELECT COUNT(*) FROM wines WHERE is_active = true");
        return ((Number) q.getSingleResult()).longValue();
    }
}
