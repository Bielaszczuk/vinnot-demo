package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.service.EventCancellationService;
import com.vinnot.event.application.service.EventScheduleChangeService;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import org.springframework.stereotype.Service;
import com.vinnot.shared.application.media.CoverImageUseCase;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Set;
import com.vinnot.shared.application.command.FieldUpdates;
import lombok.RequiredArgsConstructor;
import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.event.application.service.AnnounceNewEventNearbyService;
import com.vinnot.event.domain.valueobject.EventCancellation;
import com.vinnot.shared.domain.exception.DomainException;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class UpdateEventCommandHandler implements UpdateEventUseCase {

    /** Error code of an update asking for CANCELLED: cancelling has its own endpoint, with a reason and notices. */
    public static final String CANCEL_THROUGH_CANCEL_ENDPOINT = "USE_CANCEL_ENDPOINT";

    private final EventRepositoryPort eventRepository;
    private final CoverImageUseCase coverImages;
    private final PaidEventAvailability paidEvents;
    private final EventCancellationService cancellations;
    private final EventScheduleChangeService scheduleChanges;
    private final AnnounceNewEventNearbyService newEventsNearby;

    @Override
    @Transactional
    public void execute(UpdateEventCommand command) {
        Event event = eventRepository.findByIdForUpdate(command.eventId()).orElse(null);
        if (Objects.isNull(event)) {
            throw new EntityNotFoundException("Event", command.eventId());
        }

        if (!command.isAdmin()
                && !Objects.equals(event.getOrganizerId(), command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "EVENT_OWNERSHIP",
                    "You can only update events that you organize");
        }

        EventStatus requestedStatus = requestedStatus(command.status());
        // Editors send the status back with every save: resending the current one (SOLD_OUT included) changes nothing.
        boolean statusChanges = Objects.nonNull(requestedStatus) && requestedStatus != event.getStatus();
        if (statusChanges && requestedStatus == EventStatus.CANCELLED) {
            throw new DomainException(CANCEL_THROUGH_CANCEL_ENDPOINT,
                    "Cancel an event through its cancel endpoint, which records the reason and tells attendees about refunds");
        }

        String previousImage = event.getImageUrl();
        final boolean publishedBefore = event.isPublishedOnce();
        final EventScheduleChangeService.Schedule previousSchedule = EventScheduleChangeService.Schedule.of(event);
        String resolvedImage = coverImages.validateReference(command.imageUrl(), previousImage, CoverImageUseCase.Kind.EVENT);

        FieldUpdates updates = new FieldUpdates(command.clearFields(), Set.of(
                "description", "locationName", "locationAddress", "locationCity", "locationRegion",
                "locationCountry", "latitude", "longitude", "mapEmbedUrl", "price", "maxAttendees",
                "registrationDeadline", "paymentAlias", "paymentQrUrl", "paymentInstructions",
                "imageUrl", "contactEmail", "contactPhone", "websiteUrl"));
        EventType resolvedType = event.getEventType();
        if (Objects.nonNull(command.type())) {
            resolvedType = EventType.valueOf(command.type().toUpperCase());
        }
        event.updateBasicInfo(
                Objects.nonNull(command.title()) ? command.title() : event.getTitle(),
                updates.resolve("description", command.description(), event.getDescription()),
                resolvedType
        );

        if (Objects.nonNull(command.startDate()) || Objects.nonNull(command.endDate())) {
            event.updateDateRange(EventDateRange.of(
                    Objects.nonNull(command.startDate()) ? command.startDate() : event.getDateRange().getStartDate(),
                    Objects.nonNull(command.endDate()) ? command.endDate() : event.getDateRange().getEndDate()
            ));
        }

        EventLocation location = event.getLocation();
        Coordinates currentCoordinates = Objects.isNull(location) ? null : location.getCoordinates();
        var latitude = updates.resolve("latitude", command.latitude(),
                Objects.isNull(currentCoordinates) ? null : currentCoordinates.getLatitude());
        var longitude = updates.resolve("longitude", command.longitude(),
                Objects.isNull(currentCoordinates) ? null : currentCoordinates.getLongitude());
        if (Objects.isNull(latitude) != Objects.isNull(longitude)) {
            throw new DomainException(
                    "INVALID_COORDINATES", "Latitude and longitude must be set or cleared together");
        }
        event.updateLocation(EventLocation.of(
                updates.resolve("locationName", command.locationName(), Objects.isNull(location) ? null : location.getName()),
                updates.resolve("locationAddress", command.locationAddress(), Objects.isNull(location) ? null : location.getAddress()),
                updates.resolve("locationCity", command.locationCity(), Objects.isNull(location) ? null : location.getCity()),
                updates.resolve("locationRegion", command.locationRegion(), Objects.isNull(location) ? null : location.getRegion()),
                updates.resolve("locationCountry", command.locationCountry(), Objects.isNull(location) ? null : location.getCountry()),
                Objects.isNull(latitude) ? null : Coordinates.of(latitude, longitude),
                updates.resolve("mapEmbedUrl", command.mapEmbedUrl(), Objects.isNull(location) ? null : location.getMapEmbedUrl())));

        if (updates.changes("price", command.price())) {
            event.updatePrice(updates.resolve("price", command.price(), null));
        }

        if (updates.changes("maxAttendees", command.maxAttendees())) {
            event.updateCapacity(updates.resolve("maxAttendees", command.maxAttendees(), null));
        }

        {
            EventRegistrationSettings current = event.getRegistrationSettings();
            event.updateRegistrationSettings(EventRegistrationSettings.of(
                    Objects.requireNonNullElse(command.currency(), current.getCurrency()),
                    updates.resolve("registrationDeadline", command.registrationDeadline(), current.getRegistrationDeadline()),
                    Objects.requireNonNullElse(
                            command.maxTicketsPerRegistration(),
                            current.getMaxTicketsPerRegistration()),
                    Objects.nonNull(command.approvalMode())
                            ? EventApprovalMode.valueOf(command.approvalMode().toUpperCase())
                            : current.getApprovalMode(),
                    Objects.requireNonNullElse(
                            command.attendeeConfirmationRequired(),
                            current.isAttendeeConfirmationRequired()),
                    Objects.requireNonNullElse(
                            command.registrationHoldMinutes(),
                            current.getHoldMinutes()),
                    updates.resolve("paymentAlias", command.paymentAlias(), current.getPaymentAlias()),
                    updates.resolve("paymentQrUrl", command.paymentQrUrl(), current.getPaymentQrUrl()),
                    updates.resolve("paymentInstructions", command.paymentInstructions(), current.getPaymentInstructions())));
        }

        if (updates.changes("imageUrl", command.imageUrl())) {
            event.updateImageUrl(updates.resolve("imageUrl", resolvedImage, null));
        }

        {
            event.updateContactInfo(
                    updates.resolve("contactEmail", command.contactEmail(), event.getContactEmail()),
                    updates.resolve("contactPhone", command.contactPhone(), event.getContactPhone()),
                    updates.resolve("websiteUrl", command.websiteUrl(), event.getWebsiteUrl())
            );
        }

        if (statusChanges) {
            event.transitionTo(requestedStatus);
        }

        if (Objects.nonNull(event.getPrice()) && event.getPrice().signum() > 0
                && (event.getStatus() == EventStatus.PUBLISHED || event.getStatus() == EventStatus.SOLD_OUT)) {
            paidEvents.requireAvailable(event.getOrganizerId(), event.getPrice(),
                    event.getRegistrationSettings().getCurrency(), Instant.now());
        }

        if (event.getStatus() == EventStatus.CANCELLED) {
            cancellations.saveCancelled(event, command.requestingUserId(), EventCancellation.unspecified());
        } else {
            eventRepository.save(event);
            scheduleChanges.announce(event, previousSchedule);
            newEventsNearby.announce(event, publishedBefore, Instant.now());
        }
        if (!Objects.equals(previousImage, event.getImageUrl())) { coverImages.reconcile(previousImage); }
    }

    private static EventStatus requestedStatus(String status) {
        return Objects.isNull(status) || status.isBlank() ? null : EventStatus.valueOf(status.toUpperCase());
    }

}
