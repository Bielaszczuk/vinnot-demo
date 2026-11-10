package com.vinnot.partner.infrastructure.web.controller;

import com.vinnot.event.infrastructure.web.request.CancelEventRequest;
import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.application.command.model.CreateEventCommand;
import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.in.GetMyEventsUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.event.application.query.model.GetMyEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.partner.infrastructure.web.request.CreatePartnerEventRequest;
import com.vinnot.partner.infrastructure.web.request.UpdatePartnerEventRequest;
import com.vinnot.shared.application.util.DateTimeUtils;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import java.time.Instant;

@RestController
@RequestMapping("/partner/events")
@Tag(name = "Partner - Events", description = "Partner event management endpoints")
@RequiredArgsConstructor
public class PartnerEventController {

    private final CreateEventUseCase createEventUseCase;
    private final UpdateEventUseCase updateEventUseCase;
    private final CancelEventUseCase cancelEventUseCase;
    private final GetMyEventsUseCase getMyEventsUseCase;

    @GetMapping
    @PreAuthorize("hasAuthority('EVENT_CREATE')")
    @Operation(summary = "Get my events (partner)",
            description = "Optional search matches title, venue, city, region or country, ignoring case; blank lists all.")
    public ResponseEntity<PageResult<EventSummaryResponse>> getMyEvents(
            @AuthenticationPrincipal String principal,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID organizerId = UUID.fromString(principal);
        PageResult<EventSummaryResponse> response = getMyEventsUseCase.execute(
                new GetMyEventsQuery(organizerId, search, page, size));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('EVENT_CREATE')")
    @Operation(summary = "Create event (partner)")
    public ResponseEntity<MutationResponse> create(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreatePartnerEventRequest request) {

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
                UUID.fromString(principal), request.contactEmail(), request.contactPhone(), request.websiteUrl(),
                request.status()
        );
        UUID id = createEventUseCase.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(MutationResponse.of(id, "Event created"));
    }

    /**
     * Updates an event owned by the partner.
     *
     * @param id        the event ID
     * @param principal the authenticated user
     * @param request   the update data
     * @return success message
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('EVENT_UPDATE') or hasAuthority('EVENT_UPDATE_OWN')")
    @Operation(summary = "Update my event (partner)")
    public ResponseEntity<MutationResponse> update(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody UpdatePartnerEventRequest request) {

        UUID userId = UUID.fromString(principal);
        UpdateEventCommand command = new UpdateEventCommand(
                id,
                userId,
                false,
                request.title(),
                request.description(),
                request.type(),
                parseOptionalInstant(request.startDate()),
                parseOptionalInstant(request.endDate()),
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
                request.status(),
                request.clearFields()
        );
        updateEventUseCase.execute(command);
        return ResponseEntity.ok(MutationResponse.message("Event updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('EVENT_DELETE') or hasAuthority('EVENT_DELETE_OWN')")
    @Operation(summary = "Cancel my event (partner)")
    public ResponseEntity<Void> cancel(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) CancelEventRequest request,
            @AuthenticationPrincipal String principal) {
        cancelEventUseCase.execute(new CancelEventCommand(
                id,
                UUID.fromString(principal),
                false,
                CancelEventRequest.toCancellation(request)));
        return ResponseEntity.noContent().build();
    }

    private static Instant parseOptionalInstant(String value) {
        return Objects.isNull(value) || value.isBlank()
                ? null
                : DateTimeUtils.parseFlexibleInstant(value);
    }
}
