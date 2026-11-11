package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WineRepositoryPort {

    /**
     * Finds a wine by its unique identifier.
     *
     * @param id the wine ID
     * @return the wine if found
     */
    Optional<Wine> findById(UUID id);

    Optional<Wine> findByIdForUpdate(UUID id);

    /**
     * Gets all wines paginated.
     *
     * @param pageQuery        pagination info
     * @param includeInactive whether to include inactive wines
     * @return page of wines
     */
    PageResult<Wine> findAll(PageQuery pageQuery, boolean includeInactive);

    /**
     * Gets featured wines paginated.
     *
     * @param pageQuery pagination info
     * @return page of featured wines
     */
    PageResult<Wine> findFeatured(PageQuery pageQuery);

    /**
     * Gets top rated wines paginated.
     *
     * @param pageQuery pagination info
     * @return page of top rated wines
     */
    PageResult<Wine> findTopRated(PageQuery pageQuery);

    /** Active, rated wines ordered by average, review count and ID; no total count. */
    List<Wine> findHighlights(int limit);

    /**
     * Gets recent wines paginated.
     *
     * @param pageQuery pagination info
     * @return page of recent wines
     */
    PageResult<Wine> findRecent(PageQuery pageQuery);

    /**
     * Searches wines with advanced filters including grape, country, region.
     *
     * @param searchTerm   the search term
     * @param wineType     optional wine type filter
     * @param wineryId     optional winery filter
     * @param country      optional country filter
     * @param region       optional region filter
     * @param grapeVariety optional grape variety filter
     * @param pageQuery       pagination info
     * @param includeInactive whether inactive wines are listed too (staff listings only)
     * @return page of matching wines
     */
    PageResult<Wine> searchAdvanced(String searchTerm, String wineType, UUID wineryId,
                                    String country, String region,
                                    String grapeVariety, PageQuery pageQuery,
                                    boolean includeInactive);

    /**
     * Gets wines by winery ID.
     *
     * @param wineryId the winery ID
     * @return list of wines for the given winery
     */
    List<Wine> findByWineryId(UUID wineryId);

    /**
     * Persists a wine (create or update).
     *
     * @param wine the wine to save
     * @return the saved wine
     */
    Wine save(Wine wine);

    /**
     * Deletes a wine.
     *
     * @param wine the wine to delete
     */
    void delete(Wine wine);

    /**
     * Checks if a wine exists by ID.
     *
     * @param id the wine ID
     * @return true if exists
     */
    boolean existsById(UUID id);

    /**
     * Finds similar wines by type, excluding the given wine.
     *
     * @param wineType  the wine type to match
     * @param excludeId the wine ID to exclude
     * @param limit     maximum results
     * @return list of similar wines
     */
    List<Wine> findSimilar(WineType wineType, UUID excludeId, int limit);

    /**
     * Gets popular wines (by review count).
     *
     * @param pageQuery pagination info
     * @return page of popular wines
     */
    PageResult<Wine> findPopular(PageQuery pageQuery);

    /**
     * Gets recommended wines (featured with high rating).
     *
     * @param pageQuery pagination info
     * @return page of recommended wines
     */
    PageResult<Wine> findRecommended(PageQuery pageQuery);

    /**
     * Finds catalog candidates from field-agnostic visible label evidence.
     * Each identity term is compared with both wine and winery names because
     * label hierarchy does not always match catalog field hierarchy.
     *
     * @param criteria normalized retrieval criteria
     * @return list of matching wines ordered by retrieval relevance
     */
    List<Wine> findByFuzzyMatch(WineLabelSearchCriteria criteria);

    /**
     * Finds candidates through bounded index-only identity lookups. This is the
     * deterministic fallback when fuzzy retrieval exceeds its latency budget.
     *
     * @param criteria normalized retrieval criteria
     * @return candidates found through full-text and trigram indexes
     */
    List<Wine> findByIndexedIdentity(WineLabelSearchCriteria criteria);

    /**
     * Finds candidates that contain a structured commercial identifier such
     * as 100 X 100, #007 or 1492. This path avoids fuzzy-prefilter flooding by
     * generic numeric fragments.
     *
     * @param criteria identifier retrieval criteria
     * @return catalog rows containing the identifier
     */
    List<Wine> findByCommercialIdentity(WineLabelSearchCriteria criteria);

    /**
     * Finds the active wines of the producers whose name contains or resembles
     * the observed producer core (designators such as "Bodega" removed), so a
     * label's product can be chosen among its producer's whole catalog.
     *
     * @param criteria the producer core as the single identity term and the
     *                 maximum number of wines
     * @return wines of the most similar producers, most similar producer first
     */
    List<Wine> findByProducerIdentity(WineLabelSearchCriteria criteria);

    /**
     * Finds wines by a collection of IDs (batch lookup).
     *
     * @param ids the wine IDs
     * @return list of found wines
     */
    List<Wine> findAllByIds(Collection<UUID> ids);

    /**
     * Counts total wines.
     *
     * @return the total count
     */
    long count();
}
