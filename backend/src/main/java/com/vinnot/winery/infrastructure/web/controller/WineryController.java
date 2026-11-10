package com.vinnot.winery.infrastructure.web.controller;

import com.vinnot.winery.application.command.model.CreateWineryCommand;
import com.vinnot.winery.application.command.model.DeleteWineryCommand;
import com.vinnot.winery.application.command.model.UpdateWineryCommand;
import com.vinnot.winery.application.command.model.UpdateWineryCoordinatesCommand;
import com.vinnot.winery.application.port.in.CreateWineryUseCase;
import com.vinnot.winery.application.port.in.DeleteWineryUseCase;
import com.vinnot.winery.application.port.in.GetWineryByIdUseCase;
import com.vinnot.winery.application.port.in.SearchWineriesUseCase;
import com.vinnot.winery.application.port.in.UpdateWineryCoordinatesUseCase;
import com.vinnot.winery.application.port.in.UpdateWineryUseCase;
import com.vinnot.winery.application.query.model.GetWineryByIdQuery;
import com.vinnot.winery.application.query.model.SearchWineriesQuery;
import com.vinnot.winery.application.query.response.WineryDetailsResponse;
import com.vinnot.winery.application.query.response.WinerySummaryResponse;
import com.vinnot.winery.infrastructure.web.policy.PublicWineryCatalogAccessPolicy;
import com.vinnot.winery.infrastructure.web.request.CreateWineryRequest;
import com.vinnot.winery.infrastructure.web.request.UpdateWineryCoordinatesRequest;
import com.vinnot.winery.infrastructure.web.request.UpdateWineryRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import lombok.RequiredArgsConstructor;

/**
 * REST controller for winery endpoints.
 */
@RestController
@RequestMapping("/wineries")
@Tag(name = "Wineries", description = "Winery management endpoints")
@RequiredArgsConstructor
public class WineryController {

    private final CreateWineryUseCase createWineryUseCase;
    private final UpdateWineryUseCase updateWineryUseCase;
    private final DeleteWineryUseCase deleteWineryUseCase;
    private final UpdateWineryCoordinatesUseCase updateCoordinatesUseCase;
    private final GetWineryByIdUseCase getWineryByIdUseCase;
    private final SearchWineriesUseCase searchWineriesUseCase;
    private final PublicWineryCatalogAccessPolicy publicCatalogPolicy;

    /**
     * Gets a winery by ID.
     *
     * @param id the winery ID
     * @return the winery details
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get winery by ID")
    public ResponseEntity<WineryDetailsResponse> getById(@PathVariable UUID id) {
        WineryDetailsResponse response = getWineryByIdUseCase.execute(new GetWineryByIdQuery(id));
        return ResponseEntity.ok(response);
    }

    /**
     * Searches wineries with filters.
     *
     * @param search  search term
     * @param country country filter
     * @param region  region filter
     * @param page    page number
     * @param size    page size
     * @return page of wineries
     */
    @GetMapping
    @Operation(summary = "Search wineries")
    public ResponseEntity<PageResult<WinerySummaryResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PublicWineryCatalogAccessPolicy.Pagination pagination =
                publicCatalogPolicy.resolvePagination(page, size);
        SearchWineriesQuery query = new SearchWineriesQuery(
                search, country, region, pagination.page(), pagination.size());
        return ResponseEntity.ok(publicCatalogPolicy.constrain(searchWineriesUseCase.execute(query)));
    }

    /**
     * Creates a new winery.
     *
     * @param request the create request
     * @return the created winery ID
     */
    @PostMapping
    @PreAuthorize("hasAuthority('WINERY_CREATE')")
    @Operation(summary = "Create a new winery")
    public ResponseEntity<MutationResponse> create(@Valid @RequestBody CreateWineryRequest request) {
        CreateWineryCommand command = new CreateWineryCommand(
                request.name(),
                request.descriptionEs(),
                request.descriptionEn(),
                request.countryId(),
                request.regionId(),
                request.subregion(),
                request.address(),
                request.latitude(),
                request.longitude(),
                request.email(),
                request.phone(),
                request.website(),
                request.logoUrl(),
                request.imageUrl(),
                request.establishedYear()
        );

        UUID wineryId = createWineryUseCase.execute(command);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(MutationResponse.of(wineryId, "Winery created successfully"));
    }

    /**
     * Updates a winery.
     *
     * @param id      the winery ID
     * @param request the update request
     * @return no content
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('WINERY_UPDATE')")
    @Operation(summary = "Update a winery")
    public ResponseEntity<Void> update(@PathVariable UUID id, @Valid @RequestBody UpdateWineryRequest request) {
        UpdateWineryCommand command = new UpdateWineryCommand(
                id,
                request.name(),
                request.descriptionEs(),
                request.descriptionEn(),
                request.countryId(),
                request.regionId(),
                request.subregion(),
                request.address(),
                request.latitude(),
                request.longitude(),
                request.email(),
                request.phone(),
                request.website(),
                request.logoUrl(),
                request.imageUrl(),
                request.establishedYear()
        );

        updateWineryUseCase.execute(command);

        return ResponseEntity.noContent().build();
    }

    /**
     * Updates only the coordinates of a winery (geocode caching).
     * Only updates if the winery doesn't already have coordinates.
     *
     * @param id      the winery ID
     * @param request the coordinates request
     * @return no content
     */
    @PatchMapping("/{id}/coordinates")
    @PreAuthorize("hasAuthority('WINERY_UPDATE')")
    @Operation(summary = "Update winery coordinates (geocode cache)")
    public ResponseEntity<Void> updateCoordinates(@PathVariable UUID id,
                                                   @Valid @RequestBody UpdateWineryCoordinatesRequest request) {
        UpdateWineryCoordinatesCommand command = new UpdateWineryCoordinatesCommand(
                id, request.latitude(), request.longitude(), request.address()
        );
        updateCoordinatesUseCase.execute(command);
        return ResponseEntity.noContent().build();
    }

    /**
     * Deletes a winery.
     *
     * @param id the winery ID
     * @return no content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('WINERY_DELETE')")
    @Operation(summary = "Delete a winery")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        deleteWineryUseCase.execute(new DeleteWineryCommand(id));
        return ResponseEntity.noContent().build();
    }
}
