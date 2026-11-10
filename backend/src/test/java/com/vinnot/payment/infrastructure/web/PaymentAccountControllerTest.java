package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.ConnectPaymentAccountUseCase;
import com.vinnot.payment.application.port.in.GetCommissionPolicyUseCase;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentAccountControllerTest {
    @Test
    void publicCallbackReturnsOnlyTheServerSelectedReturnChannel() {
        var useCase = mock(ConnectPaymentAccountUseCase.class);
        when(useCase.completeCallback("state", "code")).thenReturn(true);
        var response = new PaymentConnectionCallbackController(useCase).complete(new PaymentAccountController.CompleteRequest("state", "code"));
        assertThat(response.getBody().returnToApp()).isTrue();
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
        verify(useCase).completeCallback("state", "code");
    }

    @Test
    void returnsOnlySafeConnectionStatusAndNoStoreResponses() {
        var useCase = mock(ConnectPaymentAccountUseCase.class);
        var controller = new PaymentAccountController(useCase, () -> new CommissionPolicy(300, "VINNOT_3_PERCENT_V1"));
        UUID owner = UUID.randomUUID();
        var uri = URI.create("https://auth.mercadopago.com/authorization?state=proof");
        when(useCase.begin(owner, false)).thenReturn(uri);
        when(useCase.isConnected(owner)).thenReturn(true);
        assertThat(controller.connect(owner.toString(), null).getBody().authorizationUrl()).isEqualTo(uri);
        var status = controller.status(owner.toString());
        assertThat(status.getBody().connected()).isTrue();
        assertThat(status.getBody().environment()).isEqualTo("SANDBOX");
        assertThat(status.getBody().commissionBasisPoints()).isEqualTo(300);
        assertThat(status.getBody().commissionPercent()).isEqualByComparingTo("3");
        assertThat(status.getHeaders().getCacheControl()).isEqualTo("no-store");
        var request = new PaymentAccountController.CompleteRequest("state", "code");
        assertThat(controller.complete(owner.toString(), request).getStatusCode().value()).isEqualTo(204);
        verify(useCase).complete(owner, "state", "code");
        assertThat(request.toString()).isEqualTo("CompleteRequest[REDACTED]");
    }

    @Test
    void statusReportsTheCurrentCommissionSoClientsNeverHardCodeIt() {
        var useCase = mock(ConnectPaymentAccountUseCase.class);
        GetCommissionPolicyUseCase commission = () -> new CommissionPolicy(250, "VINNOT_2_5_PERCENT_V1");
        UUID owner = UUID.randomUUID();
        when(useCase.isConnected(owner)).thenReturn(false);
        var status = new PaymentAccountController(useCase, commission).status(owner.toString());
        assertThat(status.getBody().connected()).isFalse();
        assertThat(status.getBody().commissionBasisPoints()).isEqualTo(250);
        assertThat(status.getBody().commissionPercent()).isEqualByComparingTo("2.5");
        assertThat(status.getHeaders().getCacheControl()).isEqualTo("no-store");
    }
}
