package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.wine.application.port.in.GetFeaturedWinesUseCase;
import com.vinnot.wine.application.port.in.GetPopularWinesUseCase;
import com.vinnot.wine.application.port.in.GetRecentWinesUseCase;
import com.vinnot.wine.application.port.in.GetRecommendedWinesUseCase;
import com.vinnot.wine.application.port.in.GetSimilarWinesUseCase;
import com.vinnot.wine.application.port.in.GetTopRatedWinesUseCase;
import com.vinnot.wine.application.port.in.GetWineByIdUseCase;
import com.vinnot.wine.application.port.in.GetWineHighlightsUseCase;
import com.vinnot.wine.application.port.in.SearchWinesUseCase;
import com.vinnot.wine.application.query.model.GetFeaturedWinesQuery;
import com.vinnot.wine.application.query.model.GetPopularWinesQuery;
import com.vinnot.wine.application.query.model.GetRecentWinesQuery;
import com.vinnot.wine.application.query.model.GetRecommendedWinesQuery;
import com.vinnot.wine.application.query.model.GetSimilarWinesQuery;
import com.vinnot.wine.application.query.model.GetTopRatedWinesQuery;
import com.vinnot.wine.application.query.model.GetWineByIdQuery;
import com.vinnot.wine.application.query.model.GetWineHighlightsQuery;
import com.vinnot.wine.application.query.model.SearchWinesQuery;
import com.vinnot.wine.application.query.response.WineDetailsResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.infrastructure.web.policy.PublicWineCatalogAccessPolicy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/wines")
@Tag(name = "Wines - Queries", description = "Wine read endpoints")
@RequiredArgsConstructor
public class WineReadController {

    private final GetWineByIdUseCase getWineByIdHandler;
    private final SearchWinesUseCase searchWinesHandler;
    private final GetFeaturedWinesUseCase getFeaturedHandler;
    private final GetTopRatedWinesUseCase getTopRatedHandler;
    private final GetRecentWinesUseCase getRecentHandler;
    private final GetSimilarWinesUseCase getSimilarHandler;
    private final GetPopularWinesUseCase getPopularHandler;
    private final GetRecommendedWinesUseCase getRecommendedHandler;
    private final PublicWineCatalogAccessPolicy publicCatalogPolicy;
    private final GetWineHighlightsUseCase getHighlightsHandler;

    @GetMapping("/highlights")
    @Operation(summary = "Get home wines ranked by rating and review count")
    public ResponseEntity<List<WineSummaryResponse>> getHighlights(
            @RequestParam(defaultValue = "4") int limit) {
        return ResponseEntity.ok(getHighlightsHandler.execute(new GetWineHighlightsQuery(limit)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get wine by ID")
    public ResponseEntity<WineDetailsResponse> getById(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(getWineByIdHandler.execute(new GetWineByIdQuery(id,
                AuthorizationUtils.resourceReader(authentication))));
    }

    @GetMapping
    @Operation(summary = "Search wines with filters")
    public ResponseEntity<PageResult<WineSummaryResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) UUID wineryId,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String grapeVariety,
            @RequestParam(required = false) Integer vintage,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) BigDecimal minRating,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PublicWineCatalogAccessPolicy.Pagination pagination =
                publicCatalogPolicy.resolvePagination(page, size);
        SearchWinesQuery query = new SearchWinesQuery(
                search, type, wineryId, country, region, grapeVariety,
                vintage, minPrice, maxPrice, minRating, featured, sortBy,
                sortDirection, false, pagination.page(), pagination.size());
        return ResponseEntity.ok(publicCatalogPolicy.constrain(searchWinesHandler.execute(query)));
    }

    /** Alias for /wines/search path. */
    @GetMapping("/search")
    @Operation(summary = "Search wines (alias)")
    public ResponseEntity<PageResult<WineSummaryResponse>> searchAlias(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) UUID wineryId,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String grapeVariety,
            @RequestParam(required = false) Integer vintage,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) BigDecimal minRating,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return search(search, type, wineryId, country, region, grapeVariety, vintage,
                minPrice, maxPrice, minRating, featured, sortBy, sortDirection, page, size);
    }

    @GetMapping("/featured")
    @Operation(summary = "Get featured wines")
    public ResponseEntity<PageResult<WineSummaryResponse>> getFeatured(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PublicWineCatalogAccessPolicy.Pagination pagination =
                publicCatalogPolicy.resolvePagination(page, size);
        return ResponseEntity.ok(publicCatalogPolicy.constrain(
                getFeaturedHandler.execute(
                        new GetFeaturedWinesQuery(pagination.page(), pagination.size()))));
    }

    @GetMapping("/top-rated")
    @Operation(summary = "Get top rated wines")
    public ResponseEntity<PageResult<WineSummaryResponse>> getTopRated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PublicWineCatalogAccessPolicy.Pagination pagination =
                publicCatalogPolicy.resolvePagination(page, size);
        return ResponseEntity.ok(publicCatalogPolicy.constrain(
                getTopRatedHandler.execute(
                        new GetTopRatedWinesQuery(pagination.page(), pagination.size()))));
    }

    @GetMapping("/recent")
    @Operation(summary = "Get recent wines")
    public ResponseEntity<PageResult<WineSummaryResponse>> getRecent(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PublicWineCatalogAccessPolicy.Pagination pagination =
                publicCatalogPolicy.resolvePagination(page, size);
        return ResponseEntity.ok(publicCatalogPolicy.constrain(
                getRecentHandler.execute(
                        new GetRecentWinesQuery(pagination.page(), pagination.size()))));
    }

    @GetMapping("/{id}/similar")
    @Operation(summary = "Get similar wines")
    public ResponseEntity<List<WineSummaryResponse>> getSimilar(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "5") int limit) {
        int constrainedLimit = publicCatalogPolicy.resolveSimilarLimit(limit);
        return ResponseEntity.ok(
                getSimilarHandler.execute(new GetSimilarWinesQuery(id, constrainedLimit)));
    }

    @GetMapping("/popular")
    @Operation(summary = "Get popular wines")
    public ResponseEntity<PageResult<WineSummaryResponse>> getPopular(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PublicWineCatalogAccessPolicy.Pagination pagination =
                publicCatalogPolicy.resolvePagination(page, size);
        return ResponseEntity.ok(publicCatalogPolicy.constrain(
                getPopularHandler.execute(
                        new GetPopularWinesQuery(pagination.page(), pagination.size()))));
    }

    @GetMapping("/recommended")
    @Operation(summary = "Get recommended wines")
    public ResponseEntity<PageResult<WineSummaryResponse>> getRecommended(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PublicWineCatalogAccessPolicy.Pagination pagination =
                publicCatalogPolicy.resolvePagination(page, size);
        return ResponseEntity.ok(publicCatalogPolicy.constrain(
                getRecommendedHandler.execute(
                        new GetRecommendedWinesQuery(pagination.page(), pagination.size()))));
    }
}
