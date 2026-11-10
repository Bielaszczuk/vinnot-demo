package com.vinnot.event.application.command.handler;

import java.util.Objects;
import com.vinnot.event.application.command.model.RegisterForEventCommand;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.port.out.ProfilePointsPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.event.application.port.out.EventNotificationPreferences;
import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.shared.infrastructure.phone.LibPhoneNumberNormalizer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class RegisterForEventCommandHandlerTest {

    private EventRepositoryPort eventRepository;
    private EventRegistrationRepositoryPort registrationRepository;
    private UserRepositoryPort userRepository;
    private User user;

    @BeforeEach
    void setUp() {
        eventRepository = mock(EventRepositoryPort.class);
        registrationRepository = mock(EventRegistrationRepositoryPort.class);
        userRepository = mock(UserRepositoryPort.class);
        user = User.create("wine-user", Email.of("user@vinnot.com"),
                Password.fromHash("hash"), "Wine", "User");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(registrationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsManualRequestUsingUserFallbackContactAndWhatsappAction() {
        Event event = event(BigDecimal.ZERO, 10, EventApprovalMode.MANUAL, true);
        event.updateContactInfo(null, "+54 9 261 123-4567", null);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));

        var response = handler().execute(command(event, null, null, 2));

        assertThat(response.status()).isEqualTo(EventRegistrationStatus.REQUESTED.name());
        assertThat(response.contactName()).isEqualTo("Wine User");
        assertThat(response.contactEmail()).isEqualTo("user@vinnot.com");
        assertThat(response.contactActionUrl()).startsWith("https://wa.me/5492611234567");
    }

    @Test
    void automaticallyApprovesPaidAndFreeRegistrations() {
        Event paid = event(new BigDecimal("100"), 10, EventApprovalMode.MANUAL, true);
        paid.updateContactInfo("events@vinnot.com", null, null);
        when(eventRepository.findByIdForUpdate(paid.getId())).thenReturn(Optional.of(paid));

        var paidResponse = handler().execute(command(paid, " Guest ", " guest@vinnot.com ", 2));

        assertThat(paidResponse.status()).isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT.name());
        assertThat(paidResponse.externallyManagedPayment()).isTrue();
        assertThat(paidResponse.paymentMethod()).isEqualTo("MERCADO_PAGO");
        assertThat(paidResponse.totalAmount()).isEqualByComparingTo("200");
        assertThat(paidResponse.contactActionUrl()).startsWith("mailto:events@vinnot.com");

        Event free = event(null, 10, EventApprovalMode.AUTOMATIC, false);
        when(eventRepository.findByIdForUpdate(free.getId())).thenReturn(Optional.of(free));

        var freeResponse = handler().execute(command(free, "Guest", "guest@vinnot.com", 1));

        assertThat(freeResponse.status()).isEqualTo(EventRegistrationStatus.CONFIRMED.name());
        assertThat(free.getCapacity().getCurrentAttendees()).isEqualTo(1);
        assertThat(freeResponse.contactActionUrl()).isNull();

        Event confirmationRequired = event(
                BigDecimal.ZERO, 10, EventApprovalMode.AUTOMATIC, true);
        when(eventRepository.findByIdForUpdate(confirmationRequired.getId()))
                .thenReturn(Optional.of(confirmationRequired));

        var pendingConfirmation = handler().execute(
                command(confirmationRequired, "Guest", "guest@vinnot.com", 1));

        assertThat(pendingConfirmation.status())
                .isEqualTo(EventRegistrationStatus.AWAITING_ATTENDEE_CONFIRMATION.name());
        assertThat(confirmationRequired.getCapacity().getHeldAttendees()).isEqualTo(1);
    }

    @Test
    void savingTheContactPhoneChecksTheProfileForItsPointsAndAnUnsavedPhoneDoesNot() {
        Event event = event(BigDecimal.ZERO, 10, EventApprovalMode.MANUAL, true);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        handler().execute(new RegisterForEventCommand(event.getId(), user.getId(), 1, null, null,
                "+54 9 11 2345-6789", null, List.of(), null, false));
        verify(profilePoints, never()).profileChanged(any());

        Event other = event(BigDecimal.ZERO, 10, EventApprovalMode.MANUAL, true);
        when(eventRepository.findByIdForUpdate(other.getId())).thenReturn(Optional.of(other));
        handler().execute(new RegisterForEventCommand(other.getId(), user.getId(), 1, null, null,
                "+54 9 11 2345-6789", null, List.of(), null, true));

        assertThat(user.getPhoneNumber()).isEqualTo("+5491123456789");
        verify(userRepository).save(user);
        verify(profilePoints).profileChanged(user);
    }

    @Test
    void waitlistsWhenCapacityIsUnavailable() {
        Event event = event(BigDecimal.ZERO, 1, EventApprovalMode.AUTOMATIC, true);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));

        var response = handler().execute(command(event, "Guest", "guest@vinnot.com", 2));

        assertThat(response.status()).isEqualTo(EventRegistrationStatus.WAITLISTED.name());
    }

    @Test
    void rejectsDuplicateAndMissingAggregateRequests() {
        UUID eventId = UUID.randomUUID();
        when(eventRepository.findByIdForUpdate(eventId)).thenReturn(Optional.empty());
        RegisterForEventCommand missing = new RegisterForEventCommand(
                eventId, user.getId(), 1, null, null, null, null, List.of(), null);
        assertThatThrownBy(() -> handler().execute(missing))
                .isInstanceOf(EntityNotFoundException.class);

        Event event = event(BigDecimal.ZERO, 10, EventApprovalMode.MANUAL, true);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrationRepository.existsByEventIdAndUserId(event.getId(), user.getId()))
                .thenReturn(true);
        assertThatThrownBy(() -> handler().execute(command(event, null, null, 1)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("EVENT_ALREADY_REGISTERED");
    }

    private final PaidEventAvailability paidAvailability =
            mock(PaidEventAvailability.class);
    private final ProfilePointsPort profilePoints = mock(ProfilePointsPort.class);

    @Test
    void unavailablePaidCheckoutDoesNotCreateReservationOrHoldCapacity() {
        Event event = event(new BigDecimal("50"), 5, EventApprovalMode.MANUAL, true);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        doThrow(new BusinessRuleViolationException("EVENT_PAYMENTS_UNAVAILABLE", "Unavailable"))
                .when(paidAvailability).requireAvailable(any(), any(),
                        any(), any());
        assertThatThrownBy(() -> handler().execute(command(event, null, null, 1)))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("EVENT_PAYMENTS_UNAVAILABLE");
        verify(registrationRepository, never()).save(any());
        assertThat(event.getCapacity().getHeldAttendees()).isZero();
    }

    private RegisterForEventCommandHandler handler() {
        return new RegisterForEventCommandHandler(
                eventRepository, registrationRepository, userRepository, new LibPhoneNumberNormalizer(), paidAvailability, mock(EventNotificationPreferences.class), profilePoints);
    }

    private RegisterForEventCommand command(
            Event event, String name, String email, int attendeeCount) {
        return new RegisterForEventCommand(event.getId(), user.getId(), attendeeCount,
                name, email, null, "Note", List.of("Companion"), null);
    }

    private Event event(
            BigDecimal price, int capacity, EventApprovalMode approvalMode,
            boolean attendeeConfirmationRequired) {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)), UUID.randomUUID());
        if (Objects.nonNull(price)) {
            event.updatePrice(price);
        }
        event.updateCapacity(capacity);
        event.updateRegistrationSettings(EventRegistrationSettings.of(
                "ARS", null, 6, approvalMode, attendeeConfirmationRequired,
                60, null, null, null));
        event.publish();
        return event;
    }
}
