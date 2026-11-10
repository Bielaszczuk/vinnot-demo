package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.application.command.model.DeleteEventCommand;
import com.vinnot.event.application.command.model.PublishEventCommand;
import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.service.EventCancellationService;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.event.application.service.AnnounceNewEventNearbyService;
import com.vinnot.event.application.service.EventScheduleChangeService;
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.event.domain.valueobject.EventCancellation;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.shared.application.media.CoverImageUseCase;
import com.vinnot.shared.domain.valueobject.Coordinates;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class EventOwnershipTest {

    @Mock
    private EventRepositoryPort repository;

    @Mock
    private EventCancellationService cancellations;

    private Event event;
    private UUID organizerId;

    @BeforeEach
    void setUp() {
        organizerId = UUID.randomUUID();
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        event = Event.create(
                "Harvest tasting",
                EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)),
                organizerId);
        lenient().when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
    }

    @Test
    void rejectsPublishingAnotherOrganizersEvent() {
        PublishEventCommandHandler handler = new PublishEventCommandHandler(repository, mock(AnnounceNewEventNearbyService.class));

        assertThatThrownBy(() -> handler.execute(
                new PublishEventCommand(event.getId(), UUID.randomUUID(), false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("EVENT_OWNERSHIP");

        verify(repository, never()).save(event);
        assertThat(event.getStatus()).isEqualTo(EventStatus.DRAFT);
    }

    @Test
    void rejectsCancellingAnotherOrganizersEvent() {
        CancelEventCommandHandler handler = new CancelEventCommandHandler(repository, cancellations);

        assertThatThrownBy(() -> handler.execute(
                new CancelEventCommand(event.getId(), UUID.randomUUID(), false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("EVENT_OWNERSHIP");

        verify(repository, never()).save(event);
        assertThat(event.getStatus()).isEqualTo(EventStatus.DRAFT);
    }

    @Test
    void rejectsUpdatingAnotherOrganizersEvent() {
        UpdateEventCommandHandler handler = new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class));

        assertThatThrownBy(() -> handler.execute(updateCommand(UUID.randomUUID(), null)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("EVENT_OWNERSHIP");

        verify(repository, never()).save(event);
        assertThat(event.getTitle()).isEqualTo("Harvest tasting");
    }

    @Test
    void reportsMissingEventDuringUpdate() {
        UUID missingId = UUID.randomUUID();
        when(repository.findByIdForUpdate(missingId)).thenReturn(Optional.empty());
        UpdateEventCommand missing = new UpdateEventCommand(
                missingId, organizerId, false, null, null, null,
                null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(missing))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void rejectsDeletingAnotherOrganizersEvent() {
        DeleteEventCommandHandler handler = new DeleteEventCommandHandler(repository, cancellations);

        assertThatThrownBy(() -> handler.execute(
                new DeleteEventCommand(event.getId(), UUID.randomUUID(), false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("EVENT_OWNERSHIP");

        verify(repository, never()).save(event);
        assertThat(event.getStatus()).isEqualTo(EventStatus.DRAFT);
    }

    @Test
    void allowsAdministratorToPublishEvent() {
        PublishEventCommandHandler handler = new PublishEventCommandHandler(repository, mock(AnnounceNewEventNearbyService.class));

        handler.execute(new PublishEventCommand(event.getId(), null, true));

        verify(repository).save(event);
        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    void publishingTellsTheNearbyAnnouncementWhetherItWasPublishedBefore() {
        var nearby = mock(AnnounceNewEventNearbyService.class);

        new PublishEventCommandHandler(repository, nearby).execute(new PublishEventCommand(event.getId(), null, true));

        verify(nearby).announce(eq(event), eq(false),
                any());
    }

    @Test
    void allowsAdministratorToCancelAndDeleteEvents() {
        new CancelEventCommandHandler(repository, cancellations).execute(
                new CancelEventCommand(event.getId(), null, true));

        verify(cancellations).saveCancelled(event, null, EventCancellation.unspecified());
        assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);

        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        Event deletable = Event.create("Delete me", EventType.TASTING,
                EventDateRange.of(start, start.plus(1, ChronoUnit.HOURS)), organizerId);
        when(repository.findByIdForUpdate(deletable.getId())).thenReturn(Optional.of(deletable));

        new DeleteEventCommandHandler(repository, cancellations).execute(
                new DeleteEventCommand(deletable.getId(), null, true));

        verify(cancellations).saveCancelled(deletable, null, EventCancellation.unspecified());
        assertThat(deletable.getStatus()).isEqualTo(EventStatus.CANCELLED);
    }

    @Test
    void appliesStatusIncludedInOwnedEventUpdate() {
        UpdateEventCommandHandler handler = new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class));

        handler.execute(updateCommand(organizerId, "PUBLISHED"));

        verify(repository).save(event);
        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    void appliesCompleteAdministrativeEventUpdate() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        UpdateEventCommand command = new UpdateEventCommand(
                event.getId(), null, true, "Complete update", "Description", "DINNER",
                start, start.plus(3, ChronoUnit.HOURS), "Winery", "Address", "Mendoza",
                "Mendoza", "Argentina", new BigDecimal("-32.9"),
                new BigDecimal("-68.8"), "map", new BigDecimal("12000"), 50,
                "USD", start.minus(1, ChronoUnit.DAYS), 4, "AUTOMATIC", false,
                60, "alias", "qr", "instructions", "image", "mail@vinnot.com",
                "+549", "https://event.test", null, "PUBLISHED");

        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command);

        assertThat(event.getTitle()).isEqualTo("Complete update");
        assertThat(event.getEventType()).isEqualTo(EventType.DINNER);
        assertThat(event.getLocation().getCountry()).isEqualTo("Argentina");
        assertThat(event.getLocation().hasCoordinates()).isTrue();
        assertThat(event.getPrice()).isEqualByComparingTo("12000");
        assertThat(event.getCapacity().getMaxAttendees()).isEqualTo(50);
        assertThat(event.getRegistrationSettings().getCurrency()).isEqualTo("USD");
        assertThat(event.getImageUrl()).isEqualTo("image");
        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    void preservesExistingCoordinatesAndOptionalPaymentInstructionsOnPartialUpdate() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        event.updateLocation(EventLocation.of(
                "Original", "Address", "Mendoza", "Mendoza", "Argentina",
                Coordinates.of(
                        new BigDecimal("-32.9"), new BigDecimal("-68.8")), "map"));
        event.updateRegistrationSettings(
                EventRegistrationSettings.of(
                        "ARS", null, 3,
                        EventApprovalMode.MANUAL,
                        true, 60, "alias", "qr", "instructions"));
        UpdateEventCommand command = new UpdateEventCommand(
                event.getId(), organizerId, false, null, null, null,
                null, null, "Renamed", null, null, null, null,
                null, null, null, null, null, "USD", null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null);

        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command);

        assertThat(event.getLocation().getName()).isEqualTo("Renamed");
        assertThat(event.getLocation().hasCoordinates()).isTrue();
        assertThat(event.getRegistrationSettings().getPaymentAlias()).isEqualTo("alias");
        assertThat(event.getRegistrationSettings().getPaymentQrUrl()).isEqualTo("qr");
        assertThat(event.getRegistrationSettings().getPaymentInstructions())
                .isEqualTo("instructions");
    }

    @Test
    void createsAPartialLocationWhenEventHadNoLocation() {
        UpdateEventCommand command = new UpdateEventCommand(
                event.getId(), organizerId, false, null, null, null,
                null, null, null, "Only address", null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null);

        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command);

        assertThat(event.getLocation().getName()).isNull();
        assertThat(event.getLocation().getAddress()).isEqualTo("Only address");
    }

    private UpdateEventCommand updateCommand(UUID requestingUserId, String status) {
        return new UpdateEventCommand(
                event.getId(),
                requestingUserId,
                false,
                "Changed title",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                status);
    }
    private CoverImageUseCase coverImages() {
        var images = mock(CoverImageUseCase.class);
        lenient().when(images.validateReference(any(),
                any(), any()))
                .thenAnswer(call -> call.getArgument(0));
        return images;
    }

}
