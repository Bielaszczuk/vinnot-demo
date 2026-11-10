package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.infrastructure.web.request.CreateWineAdminRequest;
import com.vinnot.admin.infrastructure.web.request.UpdateWineAdminRequest;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import com.vinnot.wine.application.command.model.CreateWineCommand;
import com.vinnot.wine.application.command.model.DeleteWineCommand;
import com.vinnot.wine.application.command.model.ToggleWineActiveCommand;
import com.vinnot.wine.application.command.model.ToggleWineFeaturedCommand;
import com.vinnot.wine.application.command.model.UpdateWineCommand;
import com.vinnot.wine.application.port.in.CreateWineUseCase;
import com.vinnot.wine.application.port.in.DeleteWineUseCase;
import com.vinnot.wine.application.port.in.GetWineByIdUseCase;
import com.vinnot.wine.application.port.in.SearchWinesUseCase;
import com.vinnot.wine.application.port.in.ToggleWineActiveUseCase;
import com.vinnot.wine.application.port.in.ToggleWineFeaturedUseCase;
import com.vinnot.wine.application.port.in.UpdateWineUseCase;
import com.vinnot.wine.application.query.model.GetWineByIdQuery;
import com.vinnot.wine.application.query.model.SearchWinesQuery;
import com.vinnot.wine.application.query.response.WineDetailsResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/wines")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@Tag(name = "Admin - Wines", description = "Admin wine management endpoints")
@RequiredArgsConstructor
public class WineAdminController {

    private final CreateWineUseCase createHandler;
    private final UpdateWineUseCase updateHandler;
    private final DeleteWineUseCase deleteHandler;
    private final ToggleWineFeaturedUseCase toggleFeaturedHandler;
    private final ToggleWineActiveUseCase toggleActiveHandler;
    private final GetWineByIdUseCase getByIdHandler;
    private final SearchWinesUseCase searchHandler;

    @GetMapping
    @Operation(summary = "List all wines (admin)")
    public ResponseEntity<PageResult<WineSummaryResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResult<WineSummaryResponse> response = searchHandler.execute(
                new SearchWinesQuery(search, type, null, page, size, true));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get wine by ID (admin)")
    public ResponseEntity<WineDetailsResponse> getById(@PathVariable UUID id) {
        WineDetailsResponse response = getByIdHandler.execute(new GetWineByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create wine (admin)")
    public ResponseEntity<WineDetailsResponse> create(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateWineAdminRequest request) {
        CreateWineCommand command = new CreateWineCommand(
                request.name(), request.wineryId(), request.wineType(), request.vintage(),
                request.style(), request.grapes(), request.allergens(),
                request.descriptionEs(), request.descriptionEn(),
                request.alcoholContent(), request.servingTempMin(), request.servingTempMax(),
                request.priceMin(), request.priceMax(), request.imageUrl(),
                Boolean.TRUE.equals(request.isFeatured()), UUID.fromString(principal),
                request.isActive(), request.acidityScore(), request.tanninScore(), request.bodyScore(), request.sweetnessScore()
        );
        UUID id = createHandler.execute(command);
        WineDetailsResponse response = getByIdHandler.execute(new GetWineByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update wine (admin)")
    public ResponseEntity<WineDetailsResponse> update(@PathVariable UUID id,
                                                        @Valid @RequestBody UpdateWineAdminRequest request) {
        UpdateWineCommand command = new UpdateWineCommand(
                id, request.name(), request.wineryId(), request.wineType(),
                request.vintage(), request.style(),
                request.grapes(), request.allergens(),
                request.descriptionEs(), request.descriptionEn(),
                request.alcoholContent(), request.servingTempMin(), request.servingTempMax(),
                request.priceMin(), request.priceMax(), request.imageUrl(),
                request.isFeatured(), request.isActive(),
                request.acidityScore(), request.tanninScore(),
                request.bodyScore(), request.sweetnessScore(), request.clearFields()
        );
        updateHandler.execute(command);
        WineDetailsResponse response = getByIdHandler.execute(new GetWineByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete wine (admin)")
    public ResponseEntity<MutationResponse> delete(@PathVariable UUID id) {
        deleteHandler.execute(new DeleteWineCommand(id));
        return ResponseEntity.ok(MutationResponse.of(id, "Wine deleted successfully"));
    }

    @PostMapping("/{id}/toggle-featured")
    @Operation(summary = "Toggle wine featured status")
    public ResponseEntity<WineDetailsResponse> toggleFeatured(@PathVariable UUID id) {
        toggleFeaturedHandler.execute(new ToggleWineFeaturedCommand(id));
        WineDetailsResponse response = getByIdHandler.execute(new GetWineByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    /**
     * Toggles the active status of a wine.
     *
     * @param id the wine ID
     * @return the updated wine details
     */
    @PostMapping("/{id}/toggle-active")
    @Operation(summary = "Toggle wine active status")
    public ResponseEntity<WineDetailsResponse> toggleActive(@PathVariable UUID id) {
        toggleActiveHandler.execute(new ToggleWineActiveCommand(id));
        WineDetailsResponse response = getByIdHandler.execute(new GetWineByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }
}
