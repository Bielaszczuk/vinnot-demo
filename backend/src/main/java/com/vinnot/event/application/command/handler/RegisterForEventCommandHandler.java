package com.vinnot.event.application.command.handler;

import com.vinnot.shared.application.port.PhoneNumberNormalizer;
import com.vinnot.event.application.command.model.RegisterForEventCommand;
import com.vinnot.event.application.port.in.RegisterForEventUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.port.out.ProfilePointsPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import com.vinnot.event.application.port.out.EventNotificationPreferences;
import com.vinnot.event.application.port.out.PaidEventAvailability;

@Service
@RequiredArgsConstructor
public class RegisterForEventCommandHandler implements RegisterForEventUseCase {

    private final EventRepositoryPort eventRepository;
    private final EventRegistrationRepositoryPort registrationRepository;
    private final UserRepositoryPort userRepository;
    private final PhoneNumberNormalizer phoneNumbers;
    private final PaidEventAvailability paidEvents;
    private final EventNotificationPreferences notificationPreferences;
    private final ProfilePointsPort profilePoints;

    @Override
    @Transactional
    public EventRegistrationResponse execute(RegisterForEventCommand command) {
        Event event = eventRepository.findByIdForUpdate(command.eventId())
                .orElseThrow(() -> new EntityNotFoundException("Event", command.eventId()));
        event.ensureRegistrationRequestAllowed(command.attendeeCount());

        if (registrationRepository.existsByEventIdAndUserId(
                command.eventId(), command.userId())) {
            throw new BusinessRuleViolationException(
                    "EVENT_ALREADY_REGISTERED",
                    "You already have an active registration for this event");
        }

        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));
        EventRegistrationSettings settings = event.getRegistrationSettings();
        BigDecimal totalAmount = Objects.isNull(event.getPrice())
                ? BigDecimal.ZERO
                : event.getPrice().multiply(BigDecimal.valueOf(command.attendeeCount()));

        if (totalAmount.signum() > 0) {
            paidEvents.requireAvailable(event.getOrganizerId(), totalAmount, settings.getCurrency(),
                    settings.holdUntil(Instant.now(), event.getDateRange().getStartDate()));
        }

        // Null means an older client omitted the contact; explicit blank opts out for this reservation.
        String contactPhone = Objects.isNull(command.contactPhone()) ? user.getPhoneNumber()
                : phoneNumbers.normalizeOptional(command.contactPhone());
        if (command.saveContactPhone() && Objects.isNull(contactPhone)) {
            throw new BusinessRuleViolationException("INVALID_PHONE_NUMBER", "A phone is required to save it for future reservations");
        }
        EventRegistration registration = EventRegistration.request(
                event.getId(),
                command.userId(),
                command.attendeeCount(),
                firstText(
                        command.contactName(),
                        user.getFullName().isBlank() ? user.getUsername() : user.getFullName()),
                firstText(command.contactEmail(), user.getEmail().getValue()),
                contactPhone,
                command.note(),
                command.companionNames(),
                settings.getCurrency(),
                totalAmount);

        if (!event.hasAvailableCapacity(command.attendeeCount())) {
            registration.waitlist("The requested group exceeds currently available capacity");
        } else if (totalAmount.signum() > 0 || settings.getApprovalMode() == EventApprovalMode.AUTOMATIC) {
            approveAutomatically(event, registration, settings, totalAmount);
        }

        if (totalAmount.signum() > 0) {
            registration.requireProviderVerification();
        }
        EventRegistration saved = registrationRepository.save(registration);
        notificationPreferences.setLanguage(saved.getId(), command.notificationLanguage());
        eventRepository.save(event);
        if (command.saveContactPhone()) {
            user.updatePhoneNumber(contactPhone);
            userRepository.save(user);
            profilePoints.profileChanged(user);
        }
        return EventRegistrationResponse.fromDomain(
                saved,
                buildContactActionUrl(event, saved, command.notificationLanguage()));
    }

    private void approveAutomatically(
            Event event,
            EventRegistration registration,
            EventRegistrationSettings settings,
            BigDecimal totalAmount) {
        if (totalAmount.signum() > 0) {
            event.holdAttendees(registration.getAttendeeCount());
            registration.approvePaid(settings.holdUntil(Instant.now(), event.getDateRange().getStartDate()));
            return;
        }
        if (settings.isAttendeeConfirmationRequired()) {
            event.holdAttendees(registration.getAttendeeCount());
        } else {
            event.confirmAttendees(registration.getAttendeeCount());
        }
        registration.approveFree(
                settings.holdUntil(Instant.now(), event.getDateRange().getStartDate()),
                settings.isAttendeeConfirmationRequired());
    }

    private String buildContactActionUrl(Event event, EventRegistration registration, String language) {
        if (Objects.nonNull(event.getContactPhone()) && !event.getContactPhone().isBlank()) {
            String digits = event.getContactPhone().replaceAll("[^0-9]", "");
            String message = ("en".equals(language) ? "I registered for \"" : "Me inscribí a \"") + event.getTitle()
                    + ("en".equals(language) ? "\". My reference is " : "\". Mi referencia es ") + registration.getId() + ".";
            return "https://wa.me/" + digits + "?text="
                    + URLEncoder.encode(message, StandardCharsets.UTF_8);
        }
        if (Objects.nonNull(event.getContactEmail()) && !event.getContactEmail().isBlank()) {
            String subject = URLEncoder.encode(
                    ("en".equals(language) ? "Registration for " : "Inscripción a ") + event.getTitle(),
                    StandardCharsets.UTF_8);
            return "mailto:" + event.getContactEmail() + "?subject=" + subject;
        }
        return null;
    }

    private String firstText(String preferred, String guaranteedFallback) {
        return Objects.nonNull(preferred) && !preferred.isBlank()
                ? preferred.trim()
                : guaranteedFallback.trim();
    }
}
