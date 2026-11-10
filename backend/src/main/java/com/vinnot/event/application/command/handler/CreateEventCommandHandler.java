package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.CreateEventCommand;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.valueobject.Coordinates;
import org.springframework.stereotype.Service;
import com.vinnot.shared.application.media.CoverImageUseCase;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.event.application.service.AnnounceNewEventNearbyService;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CreateEventCommandHandler implements CreateEventUseCase {

    private final EventRepositoryPort eventRepository;
    private final CoverImageUseCase coverImages;
    private final PaidEventAvailability paidEvents;
    private final AnnounceNewEventNearbyService newEventsNearby;

    @Override
    @Transactional
    public UUID execute(CreateEventCommand command) {
        EventType eventType = EventType.valueOf(command.eventType().toUpperCase());
        EventDateRange dateRange = EventDateRange.of(command.startDate(), command.endDate());

        Event event = Event.create(
                command.title(),
                eventType,
                dateRange,
                command.organizerId()
        );

        event.updateBasicInfo(command.title(), command.description(), eventType);

        Coordinates coordinates = null;
        if (Objects.nonNull(command.latitude()) && Objects.nonNull(command.longitude())) {
            coordinates = Coordinates.of(command.latitude(), command.longitude());
        }

        EventLocation location = EventLocation.of(
                command.locationName(),
                command.locationAddress(),
                command.locationCity(),
                command.locationRegion(),
                command.locationCountry(),
                coordinates,
                command.mapEmbedUrl()
        );
        event.updateLocation(location);

        event.updatePrice(command.price());
        event.updateCapacity(command.maxAttendees());
        event.updateRegistrationSettings(EventRegistrationSettings.of(
                command.currency(),
                command.registrationDeadline(),
                command.maxTicketsPerRegistration(),
                parseApprovalMode(command.approvalMode()),
                command.attendeeConfirmationRequired(),
                command.registrationHoldMinutes(),
                command.paymentAlias(),
                command.paymentQrUrl(),
                command.paymentInstructions()));
        event.updateImageUrl(coverImages.validateReference(command.imageUrl(), null, CoverImageUseCase.Kind.EVENT));
        event.updateContactInfo(command.contactEmail(), command.contactPhone(), command.websiteUrl());
        applyRequestedStatus(event, command.status());

        if (Objects.nonNull(event.getPrice()) && event.getPrice().signum() > 0
                && (event.getStatus() == EventStatus.PUBLISHED || event.getStatus() == EventStatus.SOLD_OUT)) {
            paidEvents.requireAvailable(event.getOrganizerId(), event.getPrice(),
                    event.getRegistrationSettings().getCurrency(), Instant.now());
        }

        Event savedEvent = eventRepository.save(event);
        newEventsNearby.announce(savedEvent, false, Instant.now());

        return savedEvent.getId();
    }

    private EventApprovalMode parseApprovalMode(String value) {
        return Objects.isNull(value)
                ? EventApprovalMode.MANUAL
                : EventApprovalMode.valueOf(value.toUpperCase());
    }

    private void applyRequestedStatus(Event event, String status) {
        if (Objects.nonNull(status) && !status.isBlank()) {
            event.transitionTo(EventStatus.valueOf(status.toUpperCase()));
        }
    }
}
