package com.vinnot.support.application.service;
import com.vinnot.support.application.port.out.SupportRequestPort;
import com.vinnot.support.domain.model.SupportRequest;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SubmitSupportRequestServiceTest {
    @Test void returnsReceiptOnlyAfterDurableAcceptance() {
        var port = mock(SupportRequestPort.class);
        var service = new SubmitSupportRequestService(port);
        var request = new SupportRequest(UUID.randomUUID(), "Name", "a@b.org", "support", "Message");
        assertThat(service.submit(request)).isEqualTo(request.requestId());
        verify(port).accept(request);
        doThrow(new IllegalStateException("unavailable")).when(port).accept(request);
        assertThatThrownBy(() -> service.submit(request)).isInstanceOf(IllegalStateException.class);
    }
}
