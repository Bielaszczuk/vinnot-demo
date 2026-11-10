package com.vinnot.payment.application.port.in;
import com.vinnot.payment.domain.model.OrganizerPayment;
import java.util.List;
import java.util.UUID;
public interface GetOrganizerPaymentsUseCase {
    List<OrganizerPayment> get(UUID actorId, UUID eventId, List<UUID> registrationIds);
}
