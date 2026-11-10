package com.vinnot.wineroute.infrastructure.web.controller;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import com.vinnot.wineroute.application.command.model.AddRouteStopCommand;
import com.vinnot.wineroute.application.command.model.CreateWineRouteCommand;
import com.vinnot.wineroute.application.port.in.AddRouteStopUseCase;
import com.vinnot.wineroute.application.port.in.CreateWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteCountriesUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteHierarchyUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteRegionsUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteSubregionsUseCase;
import com.vinnot.wineroute.application.port.in.GetWineRouteByIdUseCase;
import com.vinnot.wineroute.application.port.in.SearchWineRoutesUseCase;
import com.vinnot.wineroute.application.query.model.GetRouteCountriesQuery;
import com.vinnot.wineroute.application.query.model.GetRouteHierarchyQuery;
import com.vinnot.wineroute.application.query.model.GetRouteRegionsQuery;
import com.vinnot.wineroute.application.query.model.GetRouteSubregionsQuery;
import com.vinnot.wineroute.application.query.model.GetWineRouteByIdQuery;
import com.vinnot.wineroute.application.query.model.SearchWineRoutesQuery;
import com.vinnot.wineroute.application.query.response.RouteHierarchyResponse;
import com.vinnot.wineroute.application.query.response.WineRouteDetailsResponse;
import com.vinnot.wineroute.application.query.response.WineRouteSummaryResponse;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import com.vinnot.wineroute.infrastructure.web.request.AddRouteStopRequest;
import com.vinnot.wineroute.infrastructure.web.request.CreateWineRouteRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for wine route endpoints.
 * Thin controller: all business logic delegated to use cases.
 */
@RestController
@RequestMapping("/wine-routes")
@Tag(name = "Wine Routes", description = "Wine route management endpoints")
@RequiredArgsConstructor
public class WineRouteController {

    private final CreateWineRouteUseCase createRouteUseCase;
    private final AddRouteStopUseCase addStopUseCase;
    private final GetWineRouteByIdUseCase getByIdUseCase;
    private final SearchWineRoutesUseCase searchUseCase;
    private final GetRouteCountriesUseCase getCountriesUseCase;
    private final GetRouteRegionsUseCase getRegionsUseCase;
    private final GetRouteSubregionsUseCase getSubregionsUseCase;
    private final GetRouteHierarchyUseCase getHierarchyUseCase;

    @GetMapping("/hierarchy")
    @Operation(summary = "Get full location hierarchy")
    public ResponseEntity<RouteHierarchyResponse> getHierarchy() {
        RouteHierarchyResponse response = getHierarchyUseCase.execute(new GetRouteHierarchyQuery());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/countries")
    @Operation(summary = "Get all countries with wine routes")
    public ResponseEntity<List<String>> getCountries() {
        List<String> countries = getCountriesUseCase.execute(new GetRouteCountriesQuery());
        return ResponseEntity.ok(countries);
    }

    @GetMapping("/countries/{country}/regions")
    @Operation(summary = "Get regions by country")
    public ResponseEntity<List<String>> getRegions(@PathVariable String country) {
        List<String> regions = getRegionsUseCase.execute(new GetRouteRegionsQuery(country));
        return ResponseEntity.ok(regions);
    }

    @GetMapping("/countries/{country}/regions/{region}/subregions")
    @Operation(summary = "Get subregions by country and region")
    public ResponseEntity<List<String>> getSubregions(
            @PathVariable String country,
            @PathVariable String region) {
        List<String> subregions = getSubregionsUseCase.execute(new GetRouteSubregionsQuery(country, region));
        return ResponseEntity.ok(subregions);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get wine route by ID")
    public ResponseEntity<WineRouteDetailsResponse> getById(@PathVariable UUID id, Authentication authentication) {
        WineRouteDetailsResponse response = getByIdUseCase.execute(new GetWineRouteByIdQuery(id,
                AuthorizationUtils.resourceReader(authentication)));
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Search wine routes",
            description = "Optional filters combine: search (name), country, region and difficulty (SHORT, MEDIUM, LONG).")
    public ResponseEntity<PageResult<WineRouteSummaryResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) RouteDifficulty difficulty,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        SearchWineRoutesQuery query = new SearchWineRoutesQuery(search, country, region, difficulty, page, size);
        PageResult<WineRouteSummaryResponse> response = searchUseCase.execute(query);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('WINE_ROUTE_CREATE')")
    @Operation(summary = "Create a new wine route")
    public ResponseEntity<MutationResponse> create(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateWineRouteRequest request) {
        CreateWineRouteCommand command = new CreateWineRouteCommand(
                request.name(),
                request.description(),
                request.country(),
                request.region(),
                request.subregion(),
                request.estimatedDuration(),
                request.estimatedDays(),
                request.totalDistance(),
                request.difficulty(),
                request.imageUrl(),
                request.recommendedWineTypes(),
                request.mapEmbedUrl(),
                UUID.fromString(principal),
                null,
                null
        );

        UUID routeId = createRouteUseCase.execute(command);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(MutationResponse.of(routeId, "Wine route created successfully"));
    }

    @PostMapping("/{routeId}/stops")
    @PreAuthorize("hasAuthority('WINE_ROUTE_UPDATE') or hasAuthority('WINE_ROUTE_UPDATE_OWN')")
    @Operation(summary = "Add a stop to a wine route")
    public ResponseEntity<MutationResponse> addStop(
            @PathVariable UUID routeId,
            @AuthenticationPrincipal String principal,
            Authentication authentication,
            @Valid @RequestBody AddRouteStopRequest request) {

        UUID stopId = addStopUseCase.execute(new AddRouteStopCommand(
                routeId,
                UUID.fromString(principal),
                AuthorizationUtils.hasAuthority(authentication, "WINE_ROUTE_UPDATE"),
                request.name(), request.description(), request.type(),
                request.address(), request.latitude(), request.longitude(),
                request.stopOrder(), request.estimatedDuration()
        ));

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(MutationResponse.of(stopId, "Stop added successfully"));
    }

}
