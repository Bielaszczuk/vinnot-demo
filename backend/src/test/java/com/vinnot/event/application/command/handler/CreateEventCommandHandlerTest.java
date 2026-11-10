package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.CreateEventCommand;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.util.UUID;
import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.event.application.service.AnnounceNewEventNearbyService;
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.shared.application.media.CoverImageUseCase;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;
import java.util.HashMap;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class CreateEventCommandHandlerTest {

    @Mock
    private EventRepositoryPort repository;

    @Test
    void createsEventWithRequestedPublishedStatus() {
        when(repository.save(any(Event.class))).thenAnswer(invocation -> invocation.getArgument(0));
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateEventCommand command = new CreateEventCommand(
                "Published tasting",
                "Description",
                "TASTING",
                start,
                start.plus(2, ChronoUnit.HOURS),
                "Winery",
                "Address",
                "Mendoza",
                "Mendoza",
                null,
                null,
                null,
                null,
                null,
                50,
                "ARS",
                null,
                6,
                "MANUAL",
                true,
                1440,
                null,
                null,
                null,
                null,
                UUID.randomUUID(),
                null,
                null,
                null,
                "PUBLISHED");
        CreateEventCommandHandler handler = new CreateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), mock(AnnounceNewEventNearbyService.class));

        UUID id = handler.execute(command);

        assertThat(id).isNotNull();
        verify(repository).save(
                argThat(
                        event -> event.getStatus() == EventStatus.PUBLISHED));
    }

    @Test
    void createsDraftWithCoordinatesAndDefaultManualApproval() {
        when(repository.save(any(Event.class))).thenAnswer(invocation -> invocation.getArgument(0));
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateEventCommand command = new CreateEventCommand(
                "Draft tasting", null, "TASTING", start,
                start.plus(2, ChronoUnit.HOURS), "Winery", "Address", "Mendoza",
                "Mendoza", "Argentina", new BigDecimal("-32.9"),
                new BigDecimal("-68.8"), null, null, 50, "ARS", null, 6,
                null, true, 60, null, null, null, null,
                UUID.randomUUID(), null, null, null, null);

        UUID id = new CreateEventCommandHandler(repository, coverImages(), mock(PaidEventAvailability.class), mock(AnnounceNewEventNearbyService.class)).execute(command);

        assertThat(id).isNotNull();
        verify(repository).save(
                argThat(saved ->
                        saved.getStatus() == EventStatus.DRAFT
                                && saved.getLocation().hasCoordinates()
                                && saved.getRegistrationSettings().getApprovalMode()
                                == EventApprovalMode.MANUAL));
    }
    @Test
    void paidDraftCanBeSavedButPublishingRequiresTheOrganizersPaymentAccount() {
        var availability = mock(PaidEventAvailability.class);
        var organizer = UUID.randomUUID();
        var start = Instant.now().plusSeconds(86400);
        var data = new HashMap<String, Object>();
        data.put("title", "Paid event"); data.put("eventType", "TASTING");
        data.put("startDate", start); data.put("endDate", start.plusSeconds(3600));
        data.put("organizerId", organizer); data.put("price", new BigDecimal("50")); data.put("currency", "ARS");
        var mapper = new ObjectMapper();
        var handler = new CreateEventCommandHandler(repository, coverImages(), availability, mock(AnnounceNewEventNearbyService.class));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        handler.execute(mapper.convertValue(data, CreateEventCommand.class));
        verifyNoInteractions(availability);
        data.put("status", "PUBLISHED");
        handler.execute(mapper.convertValue(data, CreateEventCommand.class));
        verify(availability).requireAvailable(eq(organizer),
                eq(new BigDecimal("50")), eq("ARS"), any());
        doThrow(new BusinessRuleViolationException("EVENT_PAYMENTS_UNAVAILABLE", "Unavailable"))
                .when(availability).requireAvailable(any(), any(), any(), any());
        clearInvocations(repository);
        assertThatThrownBy(() -> handler.execute(mapper.convertValue(data, CreateEventCommand.class)))
                .isInstanceOf(DomainException.class);
        verify(repository, never()).save(any());
    }

    private CoverImageUseCase coverImages() {
        var images = mock(CoverImageUseCase.class);
        lenient().when(images.validateReference(any(),
                any(), any()))
                .thenAnswer(call -> call.getArgument(0));
        return images;
    }

}
