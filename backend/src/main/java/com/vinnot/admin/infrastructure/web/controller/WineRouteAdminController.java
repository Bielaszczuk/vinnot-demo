package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.infrastructure.web.request.AddStopAdminRequest;
import com.vinnot.admin.infrastructure.web.request.CreateRouteAdminRequest;
import com.vinnot.admin.infrastructure.web.request.UpdateRouteAdminRequest;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import com.vinnot.wineroute.application.command.model.AddRouteStopCommand;
import com.vinnot.wineroute.application.command.model.ArchiveWineRouteCommand;
import com.vinnot.wineroute.application.command.model.CreateWineRouteCommand;
import com.vinnot.wineroute.application.command.model.DeleteWineRouteCommand;
import com.vinnot.wineroute.application.command.model.PublishWineRouteCommand;
import com.vinnot.wineroute.application.command.model.UpdateWineRouteCommand;
import com.vinnot.wineroute.application.port.in.AddRouteStopUseCase;
import com.vinnot.wineroute.application.port.in.ArchiveWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.CreateWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.DeleteWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.GetWineRouteByIdUseCase;
import com.vinnot.wineroute.application.port.in.PublishWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.SearchAllWineRoutesUseCase;
import com.vinnot.wineroute.application.port.in.UpdateWineRouteUseCase;
import com.vinnot.wineroute.application.query.model.GetWineRouteByIdQuery;
import com.vinnot.wineroute.application.query.model.SearchAllWineRoutesQuery;
import com.vinnot.wineroute.application.query.response.WineRouteDetailsResponse;
import com.vinnot.wineroute.application.query.response.WineRouteSummaryResponse;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/admin/routes")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@Tag(name = "Admin - Routes", description = "Admin wine route management endpoints")
@RequiredArgsConstructor
public class WineRouteAdminController {

    private final CreateWineRouteUseCase createUseCase;
    private final UpdateWineRouteUseCase updateUseCase;
    private final AddRouteStopUseCase addStopUseCase;
    private final PublishWineRouteUseCase publishUseCase;
    private final ArchiveWineRouteUseCase archiveUseCase;
    private final DeleteWineRouteUseCase deleteUseCase;
    private final GetWineRouteByIdUseCase getByIdUseCase;
    private final SearchAllWineRoutesUseCase searchAllUseCase;

    @GetMapping
    @Operation(summary = "List all wine routes (admin)")
    public ResponseEntity<PageResult<WineRouteSummaryResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResult<WineRouteSummaryResponse> response = searchAllUseCase.execute(
                new SearchAllWineRoutesQuery(search, page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get wine route by ID (admin)")
    public ResponseEntity<WineRouteDetailsResponse> getById(@PathVariable UUID id) {
        WineRouteDetailsResponse response = getByIdUseCase.execute(new GetWineRouteByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create wine route (admin)")
    public ResponseEntity<WineRouteDetailsResponse> create(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateRouteAdminRequest request) {

        UUID resolvedCreatedBy = request.createdBy();
        if (Objects.isNull(resolvedCreatedBy) && Objects.nonNull(principal)) {
            resolvedCreatedBy = UUID.fromString(principal);
        }

        List<CreateWineRouteCommand.StopData> stopDataList = null;
        if (Objects.nonNull(request.stops())) {
            stopDataList = new ArrayList<>();
            for (int i = 0; i < request.stops().size(); i++) {
                AddStopAdminRequest s = request.stops().get(i);
                int order = s.stopOrder() > 0 ? s.stopOrder() : i + 1;
                stopDataList.add(new CreateWineRouteCommand.StopData(
                        s.name(), s.description(), s.type(), s.address(),
                        s.latitude(), s.longitude(), order, s.estimatedDuration()
                ));
            }
        }

        CreateWineRouteCommand command = new CreateWineRouteCommand(
                request.name(), request.description(),
                request.country(), request.region(), request.subregion(),
                request.estimatedDuration(), request.estimatedDays(), request.totalDistance(),
                request.difficulty(), request.imageUrl(), request.recommendedWineTypes(),
                request.mapEmbedUrl(), resolvedCreatedBy, request.status(),
                stopDataList
        );
        UUID routeId = createUseCase.execute(command);

        WineRouteDetailsResponse response = getByIdUseCase.execute(
                new GetWineRouteByIdQuery(routeId, ResourceReader.staff()));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update wine route (admin)")
    public ResponseEntity<WineRouteDetailsResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRouteAdminRequest request) {

        List<UpdateWineRouteCommand.StopData> stopDataList = null;
        if (Objects.nonNull(request.stops())) {
            stopDataList = new ArrayList<>();
            for (int i = 0; i < request.stops().size(); i++) {
                AddStopAdminRequest s = request.stops().get(i);
                int order = s.stopOrder() > 0 ? s.stopOrder() : i + 1;
                stopDataList.add(new UpdateWineRouteCommand.StopData(
                        s.name(), s.description(), s.type(), s.address(),
                        s.latitude(), s.longitude(), order, s.estimatedDuration()
                ));
            }
        }

        updateUseCase.execute(new UpdateWineRouteCommand(
                id, request.name(), request.description(),
                request.country(), request.region(), request.subregion(),
                request.estimatedDuration(), request.estimatedDays(), request.totalDistance(),
                request.difficulty(), request.imageUrl(), request.mapEmbedUrl(),
                request.recommendedWineTypes(), stopDataList, request.status(), request.clearFields()
        ));

        WineRouteDetailsResponse response = getByIdUseCase.execute(
                new GetWineRouteByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{routeId}/stops")
    @Operation(summary = "Add stop to route (admin)")
    public ResponseEntity<MutationResponse> addStop(
            @PathVariable UUID routeId,
            @Valid @RequestBody AddStopAdminRequest request) {
        UUID stopId = addStopUseCase.execute(new AddRouteStopCommand(
                routeId, null, true,
                request.name(), request.description(), request.type(),
                request.address(), request.latitude(), request.longitude(),
                request.stopOrder(), request.estimatedDuration()
        ));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(MutationResponse.of(stopId, "Stop added"));
    }

    @PatchMapping("/{id}/publish")
    @Operation(summary = "Publish wine route (admin)")
    public ResponseEntity<WineRouteDetailsResponse> publish(@PathVariable UUID id) {
        publishUseCase.execute(new PublishWineRouteCommand(id));
        WineRouteDetailsResponse response = getByIdUseCase.execute(
                new GetWineRouteByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/archive")
    @Operation(summary = "Archive wine route (admin)")
    public ResponseEntity<WineRouteDetailsResponse> archive(@PathVariable UUID id) {
        archiveUseCase.execute(new ArchiveWineRouteCommand(id));
        WineRouteDetailsResponse response = getByIdUseCase.execute(
                new GetWineRouteByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete wine route (admin)")
    public ResponseEntity<MutationResponse> delete(@PathVariable UUID id) {
        deleteUseCase.execute(new DeleteWineRouteCommand(id));
        return ResponseEntity.ok(MutationResponse.of(id, "Route deleted successfully"));
    }
}
