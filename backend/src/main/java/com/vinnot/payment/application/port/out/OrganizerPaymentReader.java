package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.OrganizerPayment;
import java.util.List;
import java.util.UUID;
public interface OrganizerPaymentReader {
    /** One bounded batch, scoped by event and configured payment environment. */
    List<OrganizerPayment> find(UUID eventId, List<UUID> registrationIds);
}
