package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.port.in.SearchAdminEventsUseCase;
import com.vinnot.admin.application.query.model.SearchAdminEventsQuery;
import com.vinnot.admin.application.query.response.AdminEventSummaryResponse;
import com.vinnot.admin.infrastructure.web.request.CancelEventAdminRequest;
import com.vinnot.admin.infrastructure.web.request.CreateEventAdminRequest;
import com.vinnot.admin.infrastructure.web.request.UpdateEventAdminRequest;
import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.application.command.model.CreateEventCommand;
import com.vinnot.event.application.command.model.PublishEventCommand;
import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.in.GetEventByIdUseCase;
import com.vinnot.event.application.port.in.PublishEventUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.event.application.query.model.GetEventByIdQuery;
import com.vinnot.event.application.query.response.EventDetailsResponse;
import com.vinnot.shared.application.util.DateTimeUtils;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
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

import java.util.Objects;
import java.util.UUID;
import java.time.Instant;

@RestController
@RequestMapping("/admin/events")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@Tag(name = "Admin - Events", description = "Admin event management endpoints")
@RequiredArgsConstructor
public class EventAdminController {

    private final CreateEventUseCase createEventUseCase;
    private final UpdateEventUseCase updateEventUseCase;
    private final PublishEventUseCase publishEventUseCase;
    private final CancelEventUseCase cancelEventUseCase;
    private final GetEventByIdUseCase getEventByIdUseCase;
    private final SearchAdminEventsUseCase searchUseCase;

    @GetMapping
    @Operation(summary = "List all events (admin)")
    public ResponseEntity<PageResult<AdminEventSummaryResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageResult<AdminEventSummaryResponse> response = searchUseCase.execute(
                new SearchAdminEventsQuery(search, type, city, page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get event by ID (admin)")
    public ResponseEntity<EventDetailsResponse> getById(@PathVariable UUID id) {
        EventDetailsResponse response = getEventByIdUseCase.execute(new GetEventByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create event (admin)")
    public ResponseEntity<EventDetailsResponse> create(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateEventAdminRequest request) {

        UUID resolvedOrganizerId = request.organizerId();
        if (Objects.isNull(resolvedOrganizerId) && Objects.nonNull(principal)) {
            resolvedOrganizerId = UUID.fromString(principal);
        }

        CreateEventCommand command = new CreateEventCommand(
                request.title(), request.description(), request.type(),
                DateTimeUtils.parseFlexibleInstant(request.startDate()),
                DateTimeUtils.parseFlexibleInstant(request.endDate()),
                request.locationName(), request.locationAddress(), request.locationCity(), request.locationRegion(),
                request.locationCountry(),
                request.latitude(), request.longitude(), request.mapEmbedUrl(),
                request.price(), request.maxAttendees(),
                request.currency(),
                parseOptionalInstant(request.registrationDeadline()),
                request.maxTicketsPerRegistration(),
                request.approvalMode(),
                request.attendeeConfirmationRequired(),
                request.registrationHoldMinutes(),
                request.paymentAlias(),
                request.paymentQrUrl(),
                request.paymentInstructions(),
                request.imageUrl(),
                resolvedOrganizerId, request.contactEmail(), request.contactPhone(), request.websiteUrl(),
                request.status()
        );
        UUID id = createEventUseCase.execute(command);

        EventDetailsResponse response = getEventByIdUseCase.execute(new GetEventByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Updates an existing event.
     *
     * @param id        the event ID
     * @param principal the authenticated admin user
     * @param request   the update request
     * @return the updated event details
     */
    @PatchMapping("/{id}")
    @Operation(summary = "Update event (admin)")
    public ResponseEntity<EventDetailsResponse> update(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody UpdateEventAdminRequest request) {

        UUID adminUserId = Objects.nonNull(principal) ? UUID.fromString(principal) : null;

        UpdateEventCommand command = new UpdateEventCommand(
                id,
                adminUserId,
                true, // isAdmin
                request.title(),
                request.description(),
                request.type(),
                Objects.nonNull(request.startDate()) ? DateTimeUtils.parseFlexibleInstant(request.startDate()) : null,
                Objects.nonNull(request.endDate()) ? DateTimeUtils.parseFlexibleInstant(request.endDate()) : null,
                request.locationName(),
                request.locationAddress(),
                request.locationCity(),
                request.locationRegion(),
                request.locationCountry(),
                request.latitude(),
                request.longitude(),
                request.mapEmbedUrl(),
                request.price(),
                request.maxAttendees(),
                request.currency(),
                parseOptionalInstant(request.registrationDeadline()),
                request.maxTicketsPerRegistration(),
                request.approvalMode(),
                request.attendeeConfirmationRequired(),
                request.registrationHoldMinutes(),
                request.paymentAlias(),
                request.paymentQrUrl(),
                request.paymentInstructions(),
                request.imageUrl(),
                request.contactEmail(),
                request.contactPhone(),
                request.websiteUrl(),
                null,
                request.status(), request.clearFields()
        );
        updateEventUseCase.execute(command);

        EventDetailsResponse response = getEventByIdUseCase.execute(new GetEventByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/publish")
    @Operation(summary = "Publish event (admin)")
    public ResponseEntity<EventDetailsResponse> publish(@PathVariable UUID id) {
        publishEventUseCase.execute(new PublishEventCommand(id, null, true));
        EventDetailsResponse response = getEventByIdUseCase.execute(new GetEventByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancel event (admin)")
    public ResponseEntity<EventDetailsResponse> cancel(@PathVariable UUID id,
            @Valid @RequestBody(required = false) CancelEventAdminRequest request) {
        cancelEventUseCase.execute(new CancelEventCommand(id, null, true,
                CancelEventAdminRequest.toCancellation(request)));
        EventDetailsResponse response = getEventByIdUseCase.execute(new GetEventByIdQuery(id, ResourceReader.staff()));
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete event (admin)")
    public ResponseEntity<MutationResponse> delete(@PathVariable UUID id,
            @Valid @RequestBody(required = false) CancelEventAdminRequest request) {
        cancelEventUseCase.execute(new CancelEventCommand(id, null, true,
                CancelEventAdminRequest.toCancellation(request)));
        return ResponseEntity.ok(MutationResponse.of(id, "Event deleted successfully"));
    }

    private static Instant parseOptionalInstant(String value) {
        return Objects.isNull(value) || value.isBlank()
                ? null
                : DateTimeUtils.parseFlexibleInstant(value);
    }
}
