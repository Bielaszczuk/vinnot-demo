package com.vinnot.wine.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.shared.application.util.SearchInputLimits;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.Set;

/**
 * Query to search wines with filters.
 *
 * @param searchTerm    the search term (searches wine name and winery name)
 * @param wineType      the wine type filter
 * @param wineryId      the winery ID filter
 * @param country       the country filter
 * @param region        the region filter
 * @param grapeVariety  the grape variety filter
 * @param vintage       the vintage filter
 * @param minPrice      the minimum price filter
 * @param maxPrice      the maximum price filter
 * @param minRating     the minimum rating filter
 * @param featured      the featured filter
 * @param sortBy        the sort field (NAME, VINTAGE, PRICE, RATING, CREATED_AT)
 * @param sortDirection the sort direction (ASC, DESC)
 * @param page          the page number
 * @param size          the page size
 */
public record SearchWinesQuery(
        String searchTerm,
        String wineType,
        UUID wineryId,
        String country,
        String region,
        String grapeVariety,
        Integer vintage,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        BigDecimal minRating,
        Boolean featured,
        String sortBy,
        String sortDirection,
        boolean includeInactive,
        int page,
        int size
) implements Query<PageResult<WineSummaryResponse>> {

    public SearchWinesQuery {
        SearchInputLimits.text(searchTerm, wineType, country, region, grapeVariety);
        SearchInputLimits.option(sortBy, Set.of("name", "vintage", "price", "pricemin", "pricemax",
                "rating", "ratingaverage", "created_at", "createdat"));
        SearchInputLimits.option(sortDirection, Set.of("asc", "desc"));
    }

    public SearchWinesQuery(String searchTerm, String wineType, UUID wineryId, int page, int size) {
        this(searchTerm, wineType, wineryId, null, null, null, null,
                null, null, null, null, null, null, false, page, size);
    }

    public SearchWinesQuery(String searchTerm, String wineType, UUID wineryId,
                              int page, int size, boolean includeInactive) {
        this(searchTerm, wineType, wineryId, null, null, null, null,
                null, null, null, null, null, null, includeInactive, page, size);
    }
}
