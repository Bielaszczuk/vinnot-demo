package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.infrastructure.web.request.CreateWineryAdminRequest;
import com.vinnot.admin.infrastructure.web.request.UpdateWineryAdminRequest;
import com.vinnot.winery.application.command.model.CreateWineryCommand;
import com.vinnot.winery.application.command.model.DeleteWineryCommand;
import com.vinnot.winery.application.command.model.UpdateWineryCommand;
import com.vinnot.winery.application.port.in.CreateWineryUseCase;
import com.vinnot.winery.application.port.in.DeleteWineryUseCase;
import com.vinnot.winery.application.port.in.GetWineryByIdUseCase;
import com.vinnot.winery.application.port.in.SearchWineriesUseCase;
import com.vinnot.winery.application.port.in.UpdateWineryUseCase;
import com.vinnot.winery.application.query.model.GetWineryByIdQuery;
import com.vinnot.winery.application.query.model.SearchWineriesQuery;
import com.vinnot.winery.application.query.response.WineryDetailsResponse;
import com.vinnot.winery.application.query.response.WinerySummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/wineries")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@Tag(name = "Admin - Wineries", description = "Admin winery management endpoints")
@RequiredArgsConstructor
public class WineryAdminController {

    private final CreateWineryUseCase createHandler;
    private final UpdateWineryUseCase updateHandler;
    private final DeleteWineryUseCase deleteHandler;
    private final GetWineryByIdUseCase getByIdHandler;
    private final SearchWineriesUseCase searchHandler;

    @GetMapping
    @Operation(summary = "List all wineries (admin)")
    public ResponseEntity<PageResult<WinerySummaryResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResult<WinerySummaryResponse> response = searchHandler.execute(
                new SearchWineriesQuery(search, country, region, page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get winery by ID (admin)")
    public ResponseEntity<WineryDetailsResponse> getById(@PathVariable UUID id) {
        WineryDetailsResponse response = getByIdHandler.execute(new GetWineryByIdQuery(id));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create winery (admin)")
    public ResponseEntity<WineryDetailsResponse> create(@Valid @RequestBody CreateWineryAdminRequest request) {
        CreateWineryCommand command = new CreateWineryCommand(
                request.name(), request.descriptionEs(), request.descriptionEn(),
                request.countryId(), request.regionId(), request.subregion(), request.address(),
                request.latitude(), request.longitude(),
                request.email(), request.phone(), request.website(),
                request.logoUrl(), request.imageUrl(), request.establishedYear()
        );
        UUID id = createHandler.execute(command);
        WineryDetailsResponse response = getByIdHandler.execute(new GetWineryByIdQuery(id));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update winery (admin)")
    public ResponseEntity<WineryDetailsResponse> update(@PathVariable UUID id,
                                                          @Valid @RequestBody UpdateWineryAdminRequest request) {
        UpdateWineryCommand command = new UpdateWineryCommand(
                id, request.name(), request.descriptionEs(), request.descriptionEn(),
                request.countryId(), request.regionId(), request.subregion(), request.address(),
                request.latitude(), request.longitude(),
                request.email(), request.phone(), request.website(),
                request.logoUrl(), request.imageUrl(), request.establishedYear(), request.clearFields()
        );
        updateHandler.execute(command);
        WineryDetailsResponse response = getByIdHandler.execute(new GetWineryByIdQuery(id));
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete winery (admin)")
    public ResponseEntity<MutationResponse> delete(@PathVariable UUID id) {
        deleteHandler.execute(new DeleteWineryCommand(id));
        return ResponseEntity.ok(MutationResponse.of(id, "Winery deleted successfully"));
    }
}
