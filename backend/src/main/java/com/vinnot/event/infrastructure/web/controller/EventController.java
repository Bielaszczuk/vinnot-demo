package com.vinnot.event.infrastructure.web.controller;

import com.vinnot.event.infrastructure.web.request.CancelEventRequest;
import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.application.command.model.CancelEventRegistrationCommand;
import com.vinnot.event.application.command.model.ConfirmEventAttendanceCommand;
import com.vinnot.event.application.command.model.CreateEventCommand;
import com.vinnot.event.application.command.model.DeleteEventCommand;
import com.vinnot.event.application.command.model.PublishEventCommand;
import com.vinnot.event.application.command.model.RegisterForEventCommand;
import com.vinnot.event.application.command.model.ReportEventPaymentCommand;
import com.vinnot.event.application.command.model.ReviewEventRegistrationCommand;
import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.in.CancelEventRegistrationUseCase;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.application.port.in.ConfirmEventAttendanceUseCase;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.in.DeleteEventUseCase;
import com.vinnot.event.application.port.in.DiscoverEventsUseCase;
import com.vinnot.event.application.port.in.GetEventByIdUseCase;
import com.vinnot.event.application.port.in.GetEventRegistrationsUseCase;
import com.vinnot.event.application.port.in.GetMyEventRegistrationUseCase;
import com.vinnot.event.application.port.in.GetMyEventsUseCase;
import com.vinnot.event.application.port.in.GetNearbyEventsUseCase;
import com.vinnot.event.application.port.in.GetUpcomingEventsUseCase;
import com.vinnot.event.application.port.in.PublishEventUseCase;
import com.vinnot.event.application.port.in.RegisterForEventUseCase;
import com.vinnot.event.application.port.in.ReportEventPaymentUseCase;
import com.vinnot.event.application.port.in.ReviewEventRegistrationUseCase;
import com.vinnot.event.application.port.in.SearchEventsUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.event.application.query.model.DiscoverEventsQuery;
import com.vinnot.event.application.query.model.GetEventByIdQuery;
import com.vinnot.event.application.query.model.GetEventRegistrationsQuery;
import com.vinnot.event.application.query.model.GetMyEventRegistrationQuery;
import com.vinnot.event.application.query.model.GetMyEventsQuery;
import com.vinnot.event.application.query.model.GetNearbyEventsQuery;
import com.vinnot.event.application.query.model.GetUpcomingEventsQuery;
import com.vinnot.event.application.query.model.SearchEventsQuery;
import com.vinnot.event.application.query.response.EventDetailsResponse;
import com.vinnot.event.application.query.response.EventDiscoveryResponse;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventRegistrationAction;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.infrastructure.web.request.CreateEventRequest;
import com.vinnot.event.infrastructure.web.request.RegisterForEventRequest;
import com.vinnot.event.infrastructure.web.request.ReportEventPaymentRequest;
import com.vinnot.event.infrastructure.web.request.ReviewEventRegistrationRequest;
import com.vinnot.event.infrastructure.web.request.UpdateEventRequest;
import com.vinnot.shared.application.util.DateTimeUtils;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/events")
@Tag(name = "Events", description = "Event management endpoints")
@RequiredArgsConstructor
public class EventController {

    private final CreateEventUseCase createEventUseCase;
    private final UpdateEventUseCase updateEventUseCase;
    private final DeleteEventUseCase deleteEventUseCase;
    private final PublishEventUseCase publishEventUseCase;
    private final CancelEventUseCase cancelEventUseCase;
    private final RegisterForEventUseCase registerForEventUseCase;
    private final CancelEventRegistrationUseCase cancelRegistrationUseCase;
    private final ConfirmEventAttendanceUseCase confirmAttendanceUseCase;
    private final ReportEventPaymentUseCase reportPaymentUseCase;
    private final ReviewEventRegistrationUseCase reviewRegistrationUseCase;
    private final GetEventRegistrationsUseCase getEventRegistrationsUseCase;
    private final GetMyEventRegistrationUseCase getMyEventRegistrationUseCase;
    private final GetEventByIdUseCase getEventByIdUseCase;
    private final GetMyEventsUseCase getMyEventsUseCase;
    private final SearchEventsUseCase searchEventsUseCase;
    private final GetUpcomingEventsUseCase getUpcomingEventsUseCase;
    private final GetNearbyEventsUseCase getNearbyEventsUseCase;
    private final DiscoverEventsUseCase discoverEventsUseCase;

    @GetMapping("/{id}")
    @Operation(summary = "Get event by ID")
    public ResponseEntity<EventDetailsResponse> getById(@PathVariable UUID id, Authentication authentication) {
        EventDetailsResponse response = getEventByIdUseCase.execute(new GetEventByIdQuery(id, AuthorizationUtils.resourceReader(authentication)));
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Search events")
    public ResponseEntity<PageResult<EventSummaryResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        SearchEventsQuery query = new SearchEventsQuery(
                search, type, city, region, country, page, size);
        PageResult<EventSummaryResponse> response = searchEventsUseCase.execute(query);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get upcoming events")
    public ResponseEntity<PageResult<EventSummaryResponse>> getUpcoming(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageResult<EventSummaryResponse> response = getUpcomingEventsUseCase.execute(new GetUpcomingEventsQuery(page, size));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('EVENT_CREATE')")
    @Operation(summary = "Create a new event")
    public ResponseEntity<EventDetailsResponse> create(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateEventRequest request) {

        CreateEventCommand command = new CreateEventCommand(
                request.title(),
                request.description(),
                request.type(),
                DateTimeUtils.parseFlexibleInstant(request.startDate()),
                DateTimeUtils.parseFlexibleInstant(request.endDate()),
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
                DateTimeUtils.parseFlexibleInstant(request.registrationDeadline()),
                request.maxTicketsPerRegistration(),
                request.approvalMode(),
                request.attendeeConfirmationRequired(),
                request.registrationHoldMinutes(),
                request.paymentAlias(),
                request.paymentQrUrl(),
                request.paymentInstructions(),
                request.imageUrl(),
                UUID.fromString(principal),
                request.contactEmail(),
                request.contactPhone(),
                request.websiteUrl(),
                request.status()
        );

        UUID eventId = createEventUseCase.execute(command);
        EventDetailsResponse response = getEventByIdUseCase.execute(
                new GetEventByIdQuery(eventId, new ResourceReader(UUID.fromString(principal), false)));

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('EVENT_UPDATE') or hasAuthority('EVENT_UPDATE_OWN')")
    @Operation(summary = "Publish an event")
    public ResponseEntity<Void> publish(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            Authentication authentication) {
        publishEventUseCase.execute(new PublishEventCommand(
                id,
                UUID.fromString(principal),
                AuthorizationUtils.hasAuthority(authentication, "EVENT_UPDATE")));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('EVENT_UPDATE') or hasAuthority('EVENT_UPDATE_OWN')")
    @Operation(summary = "Cancel an event")
    public ResponseEntity<Void> cancel(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) CancelEventRequest request,
            @AuthenticationPrincipal String principal,
            Authentication authentication) {
        cancelEventUseCase.execute(new CancelEventCommand(
                id,
                UUID.fromString(principal),
                AuthorizationUtils.hasAuthority(authentication, "EVENT_UPDATE"),
                CancelEventRequest.toCancellation(request)));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/nearby")
    @Operation(summary = "Find nearby events")
    public ResponseEntity<PageResult<EventSummaryResponse>> nearby(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "50") double radiusKm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        GetNearbyEventsQuery query = new GetNearbyEventsQuery(
                latitude, longitude, radiusKm, page, size);
        PageResult<EventSummaryResponse> response = getNearbyEventsUseCase.execute(query);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/discovery")
    @Operation(summary = "Discover nearby events with distance-ordered alternatives")
    public ResponseEntity<EventDiscoveryResponse> discover(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "100") double radiusKm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        EventDiscoveryResponse response = discoverEventsUseCase.execute(
                new DiscoverEventsQuery(latitude, longitude, radiusKm, page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-events")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get events owned by authenticated user")
    public ResponseEntity<PageResult<EventSummaryResponse>> myEvents(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID userId = UUID.fromString(principal);
        PageResult<EventSummaryResponse> events = getMyEventsUseCase.execute(
                new GetMyEventsQuery(userId, page, size));
        return ResponseEntity.ok(events);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('EVENT_UPDATE') or hasAuthority('EVENT_UPDATE_OWN')")
    @Operation(summary = "Update an event")
    public ResponseEntity<EventDetailsResponse> update(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            Authentication authentication,
            @Valid @RequestBody UpdateEventRequest request) {

        UUID userId = UUID.fromString(principal);

        UpdateEventCommand command = new UpdateEventCommand(
                id,
                userId,
                AuthorizationUtils.hasAuthority(authentication, "EVENT_UPDATE"),
                request.title(),
                request.description(),
                request.type(),
                DateTimeUtils.parseFlexibleInstant(request.startDate()),
                DateTimeUtils.parseFlexibleInstant(request.endDate()),
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
                DateTimeUtils.parseFlexibleInstant(request.registrationDeadline()),
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
                request.organizerType(),
                request.status()
        );

        updateEventUseCase.execute(command);

        EventDetailsResponse response = getEventByIdUseCase.execute(
                new GetEventByIdQuery(id, AuthorizationUtils.resourceReader(authentication)));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('EVENT_DELETE') or hasAuthority('EVENT_DELETE_OWN')")
    @Operation(summary = "Delete an event")
    public ResponseEntity<MutationResponse> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            Authentication authentication) {

        UUID userId = UUID.fromString(principal);
        deleteEventUseCase.execute(new DeleteEventCommand(
                id,
                userId,
                AuthorizationUtils.hasAuthority(authentication, "EVENT_DELETE")));
        return ResponseEntity.ok(MutationResponse.message("Event deleted"));
    }

    @GetMapping("/{eventId}/registrations")
    @PreAuthorize("hasAuthority('EVENT_UPDATE') or hasAuthority('EVENT_UPDATE_OWN')")
    @Operation(summary = "Get event registrations for organizer review")
    public ResponseEntity<PageResult<EventRegistrationResponse>> getRegistrations(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal String principal,
            Authentication authentication,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(getEventRegistrationsUseCase.execute(
                new GetEventRegistrationsQuery(
                        eventId,
                        UUID.fromString(principal),
                        AuthorizationUtils.hasAuthority(authentication, "EVENT_UPDATE"),
                        parseRegistrationStatus(status),
                        page,
                        size)));
    }

    @GetMapping("/{eventId}/registrations/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get authenticated user's registration for an event")
    public ResponseEntity<EventRegistrationResponse> getMyRegistration(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal String principal) {
        return ResponseEntity.ok(getMyEventRegistrationUseCase.execute(
                new GetMyEventRegistrationQuery(eventId, UUID.fromString(principal))));
    }

    @PostMapping("/{eventId}/register")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Register for an event")
    public ResponseEntity<EventRegistrationResponse> registerForEvent(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody(required = false) RegisterForEventRequest request) {

        UUID userId = UUID.fromString(principal);
        RegisterForEventRequest resolved = Objects.requireNonNullElseGet(
                request,
                () -> new RegisterForEventRequest(1, null, null, null, null, null, null));
        EventRegistrationResponse registration = registerForEventUseCase.execute(
                new RegisterForEventCommand(
                        eventId,
                        userId,
                        resolved.attendeeCount(),
                        resolved.contactName(),
                        resolved.contactEmail(),
                        resolved.contactPhone(),
                        resolved.note(),
                        resolved.companionNames(),
                        parsePaymentMethod(resolved.paymentMethod()),
                        resolved.saveContactPhone(), resolved.notificationLanguage()));
        return ResponseEntity.status(HttpStatus.CREATED).body(registration);
    }

    @PatchMapping("/{eventId}/registrations/{registrationId}")
    @PreAuthorize("hasAuthority('EVENT_UPDATE') or hasAuthority('EVENT_UPDATE_OWN')")
    @Operation(summary = "Review an event registration")
    public ResponseEntity<EventRegistrationResponse> reviewRegistration(
            @PathVariable UUID eventId,
            @PathVariable UUID registrationId,
            @AuthenticationPrincipal String principal,
            Authentication authentication,
            @Valid @RequestBody ReviewEventRegistrationRequest request) {
        EventRegistrationResponse response = reviewRegistrationUseCase.execute(
                new ReviewEventRegistrationCommand(
                        eventId,
                        registrationId,
                        UUID.fromString(principal),
                        AuthorizationUtils.hasAuthority(authentication, "EVENT_UPDATE"),
                        parseRegistrationAction(request.action()),
                        parsePaymentMethod(request.paymentMethod()),
                        request.organizerNote()));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/registrations/{registrationId}/confirm-attendance")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Confirm attendance for a held event registration")
    public ResponseEntity<EventRegistrationResponse> confirmAttendance(
            @PathVariable UUID registrationId,
            @AuthenticationPrincipal String principal) {
        return ResponseEntity.ok(confirmAttendanceUseCase.execute(
                new ConfirmEventAttendanceCommand(
                        registrationId,
                        UUID.fromString(principal))));
    }

    @PostMapping("/registrations/{registrationId}/report-payment")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Report payment for an event registration")
    public ResponseEntity<EventRegistrationResponse> reportPayment(
            @PathVariable UUID registrationId,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody ReportEventPaymentRequest request) {
        return ResponseEntity.ok(reportPaymentUseCase.execute(
                new ReportEventPaymentCommand(
                        registrationId,
                        UUID.fromString(principal),
                        parsePaymentMethod(request.paymentMethod()))));
    }

    @DeleteMapping("/{eventId}/register")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel event registration")
    public ResponseEntity<Void> cancelRegistration(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal String principal) {

        UUID userId = UUID.fromString(principal);
        cancelRegistrationUseCase.execute(
                new CancelEventRegistrationCommand(eventId, userId));
        return ResponseEntity.noContent().build();
    }

    private EventPaymentMethod parsePaymentMethod(String value) {
        if (Objects.isNull(value) || value.isBlank()) {
            return null;
        }
        try {
            return EventPaymentMethod.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BusinessRuleViolationException(
                    "INVALID_PAYMENT_METHOD",
                    "Unsupported event payment method");
        }
    }

    private EventRegistrationAction parseRegistrationAction(String value) {
        try {
            return EventRegistrationAction.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BusinessRuleViolationException(
                    "INVALID_REGISTRATION_ACTION",
                    "Unsupported event registration action");
        }
    }

    private EventRegistrationStatus parseRegistrationStatus(String value) {
        if (Objects.isNull(value) || value.isBlank()) {
            return null;
        }
        try {
            return EventRegistrationStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BusinessRuleViolationException(
                    "INVALID_REGISTRATION_STATUS",
                    "Unsupported event registration status");
        }
    }
}
