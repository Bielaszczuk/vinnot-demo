package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.GetOrganizerPaymentsUseCase;
import com.vinnot.payment.application.port.out.OrganizerPaymentReader;
import com.vinnot.payment.domain.model.OrganizerPayment;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

public class GetOrganizerPaymentsService implements GetOrganizerPaymentsUseCase {
    private final OrganizerPaymentReader reader;
    private final EventRepositoryPort events;
    private final UserRepositoryPort users;
    public GetOrganizerPaymentsService(OrganizerPaymentReader reader, EventRepositoryPort events, UserRepositoryPort users) {
        this.reader = reader;
        this.events = events;
        this.users = users;
    }
    @Override
    @Transactional(readOnly = true)
    public List<OrganizerPayment> get(UUID actorId, UUID eventId, List<UUID> registrationIds) {
        if (Objects.isNull(registrationIds) || registrationIds.isEmpty() || registrationIds.size() > 50
                || registrationIds.stream().anyMatch(Objects::isNull)) {
            throw unavailable();
        }
        var actor = users.findById(actorId).orElseThrow(this::unavailable);
        if (!actor.isActive() || actor.isLocked() || !(actor.hasRole(Role.ADMIN) || actor.hasRole(Role.PARTNER))) {
            throw unavailable();
        }
        var event = events.findById(eventId).orElseThrow(this::unavailable);
        if (!actor.hasRole(Role.ADMIN) && !actorId.equals(event.getOrganizerId())) {
            throw unavailable();
        }
        return reader.find(eventId, registrationIds.stream().distinct().toList());
    }
    private BusinessRuleViolationException unavailable() {
        return new BusinessRuleViolationException("PAYMENT_MANAGEMENT_UNAVAILABLE", "No podés consultar los pagos de este evento.");
    }
}
