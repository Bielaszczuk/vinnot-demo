package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.ReportEventPaymentCommand;
import com.vinnot.event.application.port.in.ReportEventPaymentUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReportEventPaymentCommandHandler implements ReportEventPaymentUseCase {

    private final EventRegistrationRepositoryPort registrationRepository;

    @Override
    @Transactional
    public EventRegistrationResponse execute(ReportEventPaymentCommand command) {
        EventRegistration registration = registrationRepository
                .findByIdForUpdate(command.registrationId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "EventRegistration", command.registrationId()));
        if (!Objects.equals(registration.getUserId(), command.userId())) {
            throw new BusinessRuleViolationException(
                    "REGISTRATION_OWNERSHIP",
                    "You can only report payment for your own registration");
        }
        throw new BusinessRuleViolationException("PAYMENT_PROVIDER_VERIFICATION_REQUIRED",
                "The payment is confirmed automatically once Mercado Pago verifies it.");
    }
}
