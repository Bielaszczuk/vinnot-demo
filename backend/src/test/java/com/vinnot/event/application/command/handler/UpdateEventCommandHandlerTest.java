package com.vinnot.event.application.command.handler;

import tools.jackson.databind.ObjectMapper;
import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.event.application.service.AnnounceNewEventNearbyService;
import com.vinnot.event.application.service.EventCancellationService;
import com.vinnot.event.application.service.EventScheduleChangeService;
import com.vinnot.shared.application.media.CoverImageUseCase;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

class UpdateEventCommandHandlerTest {
    @Test
    void titleOnlyUpdatePreservesRegistrationSettingsPriceAndContacts() {
        var repository = mock(EventRepositoryPort.class);
        Instant start = Instant.now().plusSeconds(86400);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        event.updatePrice(new BigDecimal("12000"));
        event.updateCapacity(12);
        event.updateContactInfo("organizer@example.com", "123", "https://example.com");
        var settings = EventRegistrationSettings.of("ARS", start.minusSeconds(3600), 3,
                EventApprovalMode.MANUAL, false, 45, "alias", "qr", "instructions");
        event.updateRegistrationSettings(settings);
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var command = new ObjectMapper().convertValue(Map.of(
                "eventId", event.getId().toString(), "isAdmin", true, "title", "Updated"), UpdateEventCommand.class);
        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), mock(EventCancellationService.class), mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command);
        assertThat(event.getTitle()).isEqualTo("Updated");
        assertThat(event.getPrice()).isEqualByComparingTo("12000");
        assertThat(event.getContactEmail()).isEqualTo("organizer@example.com");
        assertThat(event.getRegistrationSettings()).usingRecursiveComparison().isEqualTo(settings);
        verify(repository).save(event);
        var invalidCoordinates = new ObjectMapper().convertValue(Map.of(
                "eventId", event.getId().toString(), "isAdmin", true, "latitude", 0), UpdateEventCommand.class);
        assertThatThrownBy(() -> new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), mock(EventCancellationService.class), mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(invalidCoordinates))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_COORDINATES");
    }
    @Test
    void publishingAnExistingPaidDraftRequiresReadinessBeforePersisting() {
        var repository = mock(EventRepositoryPort.class);
        var availability = mock(PaidEventAvailability.class);
        var start = Instant.now().plusSeconds(86400);
        var event = Event.create("Paid", EventType.TASTING, EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        event.updatePrice(BigDecimal.TEN);
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        doThrow(new BusinessRuleViolationException("EVENT_PAYMENTS_UNAVAILABLE", "Unavailable"))
                .when(availability).requireAvailable(any(), any(), any(), any());
        var command = new ObjectMapper().convertValue(Map.of("eventId", event.getId().toString(), "isAdmin", true, "status", "PUBLISHED"), UpdateEventCommand.class);
        assertThatThrownBy(() -> new UpdateEventCommandHandler(repository, coverImages(), availability, mock(EventCancellationService.class), mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command))
                .isInstanceOf(DomainException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void cancellingThroughAnUpdateIsRejectedPointingToTheCancelEndpoint() {
        var repository = mock(EventRepositoryPort.class);
        var cancellations = mock(EventCancellationService.class);
        Instant start = Instant.now().plusSeconds(86400);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        event.publish();
        UUID admin = UUID.randomUUID();
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var handler = new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class),
                cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class));
        for (boolean isAdmin : new boolean[] {true, false}) {
            var command = new ObjectMapper().convertValue(Map.of("eventId", event.getId().toString(), "isAdmin", isAdmin,
                    "requestingUserId", (isAdmin ? admin : event.getOrganizerId()).toString(),
                    "title", "Renamed", "status", "cancelled"), UpdateEventCommand.class);
            assertThatThrownBy(() -> handler.execute(command))
                    .isInstanceOf(DomainException.class)
                    .extracting("code").isEqualTo("USE_CANCEL_ENDPOINT");
        }
        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        assertThat(event.getTitle()).isEqualTo("Tasting");
        verify(cancellations, never()).saveCancelled(any(), any(), any());
        verify(repository, never()).save(any());
    }

    @Test
    void editingAnAlreadyCancelledEventThatSendsItsStatusBackStillSavesItAsACancellation() {
        var repository = mock(EventRepositoryPort.class);
        var cancellations = mock(EventCancellationService.class);
        Instant start = Instant.now().plusSeconds(86400);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        event.cancel();
        UUID admin = UUID.randomUUID();
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var command = new ObjectMapper().convertValue(Map.of("eventId", event.getId().toString(), "isAdmin", true,
                "requestingUserId", admin.toString(), "description", "Postponed sine die", "status", "CANCELLED"),
                UpdateEventCommand.class);

        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class),
                cancellations, mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command);

        assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);
        assertThat(event.getDescription()).isEqualTo("Postponed sine die");
        verify(cancellations).saveCancelled(event, admin, EventCancellation.unspecified());
        verify(repository, never()).save(any());
    }

    @Test
    void editingASoldOutEventThatSendsItsStatusBackIsNotAStatusChange() {
        var repository = mock(EventRepositoryPort.class);
        Instant start = Instant.now().plusSeconds(86400);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        event.updateCapacity(1);
        event.publish();
        event.registerAttendee();
        assertThat(event.getStatus()).isEqualTo(EventStatus.SOLD_OUT);
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var command = new ObjectMapper().convertValue(Map.of("eventId", event.getId().toString(), "isAdmin", false,
                "requestingUserId", event.getOrganizerId().toString(),
                "title", "Renamed", "status", "SOLD_OUT"), UpdateEventCommand.class);

        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class),
                mock(EventCancellationService.class), mock(EventScheduleChangeService.class),
                mock(AnnounceNewEventNearbyService.class)).execute(command);

        assertThat(event.getStatus()).isEqualTo(EventStatus.SOLD_OUT);
        assertThat(event.getTitle()).isEqualTo("Renamed");
        verify(repository).save(event);
    }

    @Test
    void askingForSoldOutOnAnEventThatIsNotSoldOutIsStillRejected() {
        var repository = mock(EventRepositoryPort.class);
        Instant start = Instant.now().plusSeconds(86400);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        event.publish();
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var command = new ObjectMapper().convertValue(Map.of("eventId", event.getId().toString(), "isAdmin", true,
                "status", "SOLD_OUT"), UpdateEventCommand.class);

        assertThatThrownBy(() -> new UpdateEventCommandHandler(repository, coverImages(),
                mock(PaidEventAvailability.class), mock(EventCancellationService.class),
                mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_EVENT_STATUS");
        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        verify(repository, never()).save(any());
    }

    @Test
    void publishingADraftThroughAnUpdateStillChangesItsStatus() {
        var repository = mock(EventRepositoryPort.class);
        Instant start = Instant.now().plusSeconds(86400);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var command = new ObjectMapper().convertValue(Map.of("eventId", event.getId().toString(), "isAdmin", true,
                "status", "published"), UpdateEventCommand.class);

        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class),
                mock(EventCancellationService.class), mock(EventScheduleChangeService.class),
                mock(AnnounceNewEventNearbyService.class)).execute(command);

        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        verify(repository).save(event);
    }

    @Test
    void updateAcceptsEventTypeInAnyCaseLikeCreation() {
        var repository = mock(EventRepositoryPort.class);
        Instant start = Instant.now().plusSeconds(86400);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var command = new ObjectMapper().convertValue(Map.of(
                "eventId", event.getId().toString(), "isAdmin", true, "type", "dinner"), UpdateEventCommand.class);
        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), mock(EventCancellationService.class), mock(EventScheduleChangeService.class), mock(AnnounceNewEventNearbyService.class)).execute(command);
        assertThat(event.getEventType()).isEqualTo(EventType.DINNER);
        verify(repository).save(event);
    }

    @Test
    void movingAPublishedEventHandsThePreviousScheduleToTheChangeNotices() {
        var repository = mock(EventRepositoryPort.class);
        var scheduleChanges = mock(EventScheduleChangeService.class);
        Instant start = Instant.now().plusSeconds(86400);
        var before = EventDateRange.of(start, start.plusSeconds(3600));
        Event event = Event.create("Tasting", EventType.TASTING, before, UUID.randomUUID());
        event.publish();
        when(repository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        var command = new ObjectMapper().convertValue(Map.of("eventId", event.getId().toString(), "isAdmin", true,
                "startDate", start.plusSeconds(7200).toString(), "endDate", start.plusSeconds(10800).toString(),
                "locationName", "New hall"), UpdateEventCommand.class);
        new UpdateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class),
                mock(EventCancellationService.class), scheduleChanges, mock(AnnounceNewEventNearbyService.class)).execute(command);
        verify(repository).save(event);
        verify(scheduleChanges).announce(event, new EventScheduleChangeService.Schedule(before, null, 0));
        assertThat(event.getScheduleVersion()).isEqualTo(2);
    }

    private CoverImageUseCase coverImages() {
        var images = mock(CoverImageUseCase.class);
        lenient().when(images.validateReference(any(),
                any(), any()))
                .thenAnswer(call -> call.getArgument(0));
        return images;
    }

}
