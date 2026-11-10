package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.PaymentReceiptAccess;
import com.vinnot.payment.application.port.out.PaymentReceiptReader;
import com.vinnot.payment.domain.model.PaymentReceiptStatus;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GetPaymentReceiptServiceTest {
    private final PaymentReceiptAccess access = mock(PaymentReceiptAccess.class);
    private final PaymentReceiptReader reader = mock(PaymentReceiptReader.class);
    private final GetPaymentReceiptService service = new GetPaymentReceiptService(access, reader);

    @Test
    void unverifiedCapabilitiesNeverReachPaymentData() {
        when(access.verify("tampered")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get("tampered")).isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(reader);
    }

    @Test
    void returnsOnlyPersistedOutcomeAndHidesUnavailablePayments() {
        UUID id = UUID.randomUUID();
        when(access.verify("valid")).thenReturn(Optional.of(id));
        when(reader.find(id)).thenReturn(Optional.of(PaymentReceiptStatus.REFUNDED));
        assertThat(service.get("valid")).isEqualTo(PaymentReceiptStatus.REFUNDED);
        when(reader.find(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get("valid")).isInstanceOf(EntityNotFoundException.class);
    }
}
