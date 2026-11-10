package com.vinnot.cellar.infrastructure.web.controller;

import com.vinnot.cellar.application.command.model.AddWineToCellarCommand;
import com.vinnot.cellar.application.command.model.RemoveWineFromCellarCommand;
import com.vinnot.cellar.application.command.model.UpdateCellarEntryCommand;
import com.vinnot.cellar.application.port.in.AddWineToCellarUseCase;
import com.vinnot.cellar.application.port.in.GetCellarStatsUseCase;
import com.vinnot.cellar.application.port.in.GetUserCellarUseCase;
import com.vinnot.cellar.application.port.in.RemoveWineFromCellarUseCase;
import com.vinnot.cellar.application.port.in.UpdateCellarEntryUseCase;
import com.vinnot.cellar.application.query.model.GetCellarStatsQuery;
import com.vinnot.cellar.application.query.model.GetUserCellarQuery;
import com.vinnot.cellar.application.query.response.CellarStatsResponse;
import com.vinnot.cellar.application.query.response.CellarWineResponse;
import com.vinnot.cellar.infrastructure.web.request.AddWineToCellarRequest;
import com.vinnot.cellar.infrastructure.web.request.UpdateCellarEntryRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/cellar")
@PreAuthorize("hasAuthority('CELLAR_MANAGE_OWN')")
@Tag(name = "Cellar", description = "Personal wine cellar management endpoints")
@RequiredArgsConstructor
public class CellarController {

    private final AddWineToCellarUseCase addWineToCellarUseCase;
    private final RemoveWineFromCellarUseCase removeWineFromCellarUseCase;
    private final UpdateCellarEntryUseCase updateCellarEntryUseCase;
    private final GetUserCellarUseCase getUserCellarUseCase;
    private final GetCellarStatsUseCase getCellarStatsUseCase;

    @GetMapping
    @Operation(summary = "Get current user's cellar")
    public ResponseEntity<List<CellarWineResponse>> getUserCellar(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {

        UUID userId = UUID.fromString(principal);
        PageResult<CellarWineResponse> response = getUserCellarUseCase.execute(
                new GetUserCellarQuery(userId, page, size)
        );
        return ResponseEntity.ok(response.content());
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or (hasAuthority('CELLAR_MANAGE_OWN') and #userId.toString() == authentication.name)")
    @Operation(summary = "Get user's cellar by user ID")
    public ResponseEntity<List<CellarWineResponse>> getUserCellarById(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {

        PageResult<CellarWineResponse> response = getUserCellarUseCase.execute(
                new GetUserCellarQuery(userId, page, size)
        );
        return ResponseEntity.ok(response.content());
    }

    @GetMapping("/stats")
    @Operation(summary = "Get current user's cellar statistics")
    public ResponseEntity<CellarStatsResponse> getCellarStats(
            @AuthenticationPrincipal String principal) {

        UUID userId = UUID.fromString(principal);
        CellarStatsResponse response = getCellarStatsUseCase.execute(new GetCellarStatsQuery(userId));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}/stats")
    @PreAuthorize("hasRole('ADMIN') or (hasAuthority('CELLAR_MANAGE_OWN') and #userId.toString() == authentication.name)")
    @Operation(summary = "Get cellar statistics by user ID")
    public ResponseEntity<CellarStatsResponse> getCellarStatsById(@PathVariable UUID userId) {
        CellarStatsResponse response = getCellarStatsUseCase.execute(new GetCellarStatsQuery(userId));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Add a wine to cellar")
    public ResponseEntity<CellarWineResponse> addWine(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody AddWineToCellarRequest request) {

        UUID userId = UUID.fromString(principal);
        AddWineToCellarCommand command = new AddWineToCellarCommand(
                userId,
                request.wineId(),
                request.rating(),
                request.purchasePrice(),
                request.notes(),
                request.vintage()
        );

        UUID cellarWineId = addWineToCellarUseCase.execute(command);

        PageResult<CellarWineResponse> cellar = getUserCellarUseCase.execute(
                new GetUserCellarQuery(userId, 0, 1000));
        CellarWineResponse created = cellar.content().stream()
                .filter(entry -> entry.id().equals(cellarWineId))
                .findFirst()
                .orElse(null);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove a wine from cellar")
    public ResponseEntity<Void> removeWine(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal) {
        UUID userId = UUID.fromString(principal);
        removeWineFromCellarUseCase.execute(new RemoveWineFromCellarCommand(id, userId));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a cellar entry")
    public ResponseEntity<CellarWineResponse> updateEntry(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody UpdateCellarEntryRequest request) {
        UpdateCellarEntryCommand command = new UpdateCellarEntryCommand(
                id,
                UUID.fromString(principal),
                request.rating(),
                request.purchasePrice(),
                request.notes(),
                request.vintage(),
                Boolean.TRUE.equals(request.clearVintage())
        );
        updateCellarEntryUseCase.execute(command);

        UUID userId = command.requestingUserId();
        PageResult<CellarWineResponse> cellar = getUserCellarUseCase.execute(
                new GetUserCellarQuery(userId, 0, 1000));
        CellarWineResponse updated = cellar.content().stream()
                .filter(entry -> entry.id().equals(id))
                .findFirst()
                .orElse(null);

        return ResponseEntity.ok(updated);
    }
}
