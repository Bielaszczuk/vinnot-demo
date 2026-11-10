package com.vinnot.payment.application.service;
import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class RecordPaymentNotificationServiceTest {
    @Test void acknowledgementRequiresDurableQueueWrite() {
        var queue = mock(PaymentReconciliationQueue.class);
        var service = new RecordPaymentNotificationService(queue);
        var attempt = UUID.randomUUID();
        service.record(attempt);
        verify(queue).notify(attempt);
        doThrow(new IllegalStateException("Database unavailable")).when(queue).notify(attempt);
        assertThatThrownBy(() -> service.record(attempt)).isInstanceOf(IllegalStateException.class);
    }
    @Test void applicationNotificationRetriesWhenQueueWriteFails() {
        var queue = mock(PaymentReconciliationQueue.class);
        var service = new RecordPaymentNotificationService(queue);
        service.recordKnownPayment("123");
        verify(queue).notifyKnownPayment("123");
        doThrow(new IllegalStateException("Database unavailable")).when(queue).notifyKnownPayment("123");
        assertThatThrownBy(() -> service.recordKnownPayment("123")).isInstanceOf(IllegalStateException.class);
    }
}
