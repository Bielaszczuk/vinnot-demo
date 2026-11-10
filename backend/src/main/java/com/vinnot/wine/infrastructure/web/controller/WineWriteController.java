package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.wine.application.command.model.CreateWineCommand;
import com.vinnot.wine.application.command.model.DeleteWineCommand;
import com.vinnot.wine.application.command.model.ToggleWineFeaturedCommand;
import com.vinnot.wine.application.command.model.UpdateWineCommand;
import com.vinnot.wine.application.port.in.CreateWineUseCase;
import com.vinnot.wine.application.port.in.DeleteWineUseCase;
import com.vinnot.wine.application.port.in.ToggleWineFeaturedUseCase;
import com.vinnot.wine.application.port.in.UpdateWineUseCase;
import com.vinnot.wine.infrastructure.web.request.CreateWineRequest;
import com.vinnot.wine.infrastructure.web.request.UpdateWineRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/wines")
@Tag(name = "Wines - Commands", description = "Wine write endpoints")
@RequiredArgsConstructor
public class WineWriteController {

    private final CreateWineUseCase createWineHandler;
    private final UpdateWineUseCase updateWineHandler;
    private final DeleteWineUseCase deleteWineHandler;
    private final ToggleWineFeaturedUseCase toggleFeaturedHandler;

    @PostMapping
    @PreAuthorize("hasAuthority('WINE_CREATE')")
    @Operation(summary = "Create a new wine")
    public ResponseEntity<MutationResponse> create(@Valid @RequestBody CreateWineRequest request) {
        UUID wineId = createWineHandler.execute(new CreateWineCommand(
                request.name(),
                request.wineryId(),
                request.wineType(),
                request.vintage(),
                request.style(),
                request.grapes(),
                request.allergens(),
                request.descriptionEs(),
                request.descriptionEn(),
                request.alcoholContent(),
                request.servingTempMin(),
                request.servingTempMax(),
                request.priceMin(),
                request.priceMax(),
                request.imageUrl(),
                request.isFeatured(),
                null
        ));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(MutationResponse.of(wineId, "Wine created successfully"));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('WINE_UPDATE')")
    @Operation(summary = "Update a wine")
    public ResponseEntity<Void> update(@PathVariable UUID id,
                                       @Valid @RequestBody UpdateWineRequest request) {
        updateWineHandler.execute(new UpdateWineCommand(
                id,
                request.name(),
                null,
                null,
                request.vintage(),
                request.style(),
                request.grapes(),
                request.allergens(),
                request.descriptionEs(),
                request.descriptionEn(),
                request.alcoholContent(),
                request.servingTempMin(),
                request.servingTempMax(),
                request.priceMin(),
                request.priceMax(),
                request.imageUrl(),
                null,
                null,
                null,
                null,
                null,
                null
        ));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('WINE_DELETE')")
    @Operation(summary = "Delete a wine")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        deleteWineHandler.execute(new DeleteWineCommand(id));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-featured")
    @PreAuthorize("hasAuthority('WINE_UPDATE')")
    @Operation(summary = "Toggle featured status")
    public ResponseEntity<Void> toggleFeatured(@PathVariable UUID id) {
        toggleFeaturedHandler.execute(new ToggleWineFeaturedCommand(id));
        return ResponseEntity.noContent().build();
    }
}
