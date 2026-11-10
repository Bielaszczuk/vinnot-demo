package com.vinnot.payment.infrastructure.config;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.payment.application.port.in.ConnectPaymentAccountUseCase;
import com.vinnot.payment.application.port.in.GetCommissionPolicyUseCase;
import com.vinnot.payment.application.port.out.CurrentCommissionPolicy;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.application.port.out.PaymentAccountStore;
import com.vinnot.payment.infrastructure.web.PaymentAccountController;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class PaymentSandboxConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(PaymentSandboxConfiguration.class, PaymentAccountController.class)
            .withBean(JdbcTemplate.class, () -> mock(JdbcTemplate.class))
            .withBean(UserRepositoryPort.class, () -> mock(UserRepositoryPort.class))
            .withBean(NotificationPort.class, () -> mock(NotificationPort.class))
            .withBean(PushNotificationPort.class, () -> mock(PushNotificationPort.class));

    @Test
    void livePilotFailsClosedWithoutExplicitDistinctSeller() {
        var configured = runner.withPropertyValues("app.payments.enabled=true", "app.payments.environment=LIVE_PILOT",
                "app.payments.client-id=123", "app.payments.client-secret=fixture",
                "app.payments.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "app.payments.redirect-uri=https://dev.vinnot.com/partner/payments/callback");
        configured.run(c -> assertThat(c).hasFailed());
        configured.withPropertyValues("app.payments.pilot-seller-id=123", "app.payments.platform-owner-id=123")
                .run(c -> assertThat(c).hasFailed());
        configured.withPropertyValues("app.payments.pilot-seller-id=456", "app.payments.platform-owner-id=123")
                .run(c -> assertThat(c).hasNotFailed().hasSingleBean(ConnectPaymentAccountUseCase.class));
    }

    @Test
    void productionStartsWithoutPilotSellerAndRequiresPlatformIdentity() {
        var configured = runner.withPropertyValues("app.payments.enabled=true", "app.payments.environment=LIVE",
                "app.payments.client-id=123", "app.payments.client-secret=fixture",
                "app.payments.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "app.payments.redirect-uri=https://vinnot.com/partner/payments/callback");
        configured.run(c -> assertThat(c).hasFailed());
        configured.withPropertyValues("app.payments.platform-owner-id=123")
                .run(c -> assertThat(c).hasNotFailed().hasSingleBean(ConnectPaymentAccountUseCase.class));
    }

    @Test
    void integrationIsAbsentByDefaultAndFailsClosedWhenEnabledWithoutSecrets() {
        runner.run(context -> {
            assertThat(context).hasNotFailed().doesNotHaveBean(ConnectPaymentAccountUseCase.class)
                    .doesNotHaveBean(PaymentAccountStore.class).doesNotHaveBean(PaymentAccountController.class);
        });
        runner.withPropertyValues("app.payments.enabled=true").run(context -> assertThat(context).hasFailed());
        runner.withPropertyValues("app.payments.enabled=true",
                "app.payments.client-id=123", "app.payments.client-secret=test-fixture",
                "app.payments.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "app.payments.redirect-uri=https://dev.vinnot.com/partner/payments/callback")
                .run(context -> assertThat(context).hasNotFailed().hasSingleBean(ConnectPaymentAccountUseCase.class)
                        .hasSingleBean(PaymentAccountController.class));
    }

    @Test
    void commissionDefaultsToThreePercentAndRefusesToStartWhenTheRateDisagreesWithItsName() {
        var enabled = runner.withPropertyValues("app.payments.enabled=true",
                "app.payments.client-id=123", "app.payments.client-secret=test-fixture",
                "app.payments.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "app.payments.redirect-uri=https://dev.vinnot.com/partner/payments/callback");
        enabled.run(c -> {
            assertThat(c).hasNotFailed();
            assertThat(c.getBean(CurrentCommissionPolicy.class).current()).isEqualTo(CommissionPolicy.DEFAULT);
            assertThat(c.getBean(GetCommissionPolicyUseCase.class).current()).isEqualTo(CommissionPolicy.DEFAULT);
        });
        enabled.withPropertyValues("app.payments.commission.basis-points=800", "app.payments.commission.policy=VINNOT_8_PERCENT_V1")
                .run(c -> assertThat(c.getBean(GetCommissionPolicyUseCase.class).current())
                        .isEqualTo(new CommissionPolicy(800, "VINNOT_8_PERCENT_V1")));
        enabled.withPropertyValues("app.payments.commission.basis-points=800")
                .run(c -> assertThat(c).hasFailed().getFailure().hasRootCauseMessage(
                        "Commission policy VINNOT_3_PERCENT_V1 does not match 800 basis points"));
        enabled.withPropertyValues("app.payments.commission.basis-points=3001", "app.payments.commission.policy=VINNOT_30_01_PERCENT_V1")
                .run(c -> assertThat(c).hasFailed());
    }

    @Test
    void rejectsUnsafeRedirectsAndMissingClientCredentials() {
        var configuration = new PaymentSandboxConfiguration();
        var store = mock(PaymentAccountStore.class);
        var users = mock(UserRepositoryPort.class);
        for (String uri : new String[]{"http://vinnot.com", "https:/no-host", "https://user:pass@vinnot.com", "https://vinnot.com/?url=evil", "https://vinnot.com/#code"}) {
            assertThatThrownBy(() -> configuration.paymentAuthorizationGateway("123", "secret", URI.create(uri), PaymentExecutionPolicy.sandbox()))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> configuration.paymentAuthorizationGateway("bad", "secret", URI.create("https://vinnot.com/callback"), PaymentExecutionPolicy.sandbox()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> configuration.paymentAuthorizationGateway("123", " ", URI.create("https://vinnot.com/callback"), PaymentExecutionPolicy.sandbox()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
