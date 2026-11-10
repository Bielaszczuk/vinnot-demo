package com.vinnot.payment.infrastructure.config;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.port.out.CurrentCommissionPolicy;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.application.port.in.ReconcilePaymentsUseCase;
import com.vinnot.payment.infrastructure.web.PaymentWebhookController;
import com.vinnot.payment.infrastructure.web.PaymentRefundController;
import com.vinnot.payment.infrastructure.security.MercadoPagoWebhookSignature;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.infrastructure.scheduling.PaymentReconciliationScheduler;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.springframework.scheduling.annotation.Scheduled;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class PaymentSettlementConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withPropertyValues("app.payments.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
            .withBean(PaymentExecutionPolicy.class, PaymentExecutionPolicy::sandbox)
            .withBean(CurrentCommissionPolicy.class, () -> () -> CommissionPolicy.DEFAULT)
            .withUserConfiguration(PaymentSettlementConfiguration.class, PaymentWebhookController.class, PaymentRefundController.class)
            .withBean(JdbcTemplate.class, () -> mock(JdbcTemplate.class))
            .withBean(UserRepositoryPort.class, () -> mock(UserRepositoryPort.class))
            .withBean(EventRepositoryPort.class, () -> mock(EventRepositoryPort.class))
            .withBean(EventRegistrationRepositoryPort.class, () -> mock(EventRegistrationRepositoryPort.class))
            .withBean(SellerCredentialReader.class, () -> mock(SellerCredentialReader.class))
            .withBean(NotificationPort.class,
                    () -> mock(NotificationPort.class))
            .withBean(PushNotificationPort.class,
                    () -> mock(PushNotificationPort.class));
    @Test void providerWorkDoesNotBlockReservationExpiryScheduler() throws Exception {
        var configuration = new PaymentSettlementConfiguration();
        var provider = configuration.paymentTaskScheduler();
        var maintenance = configuration.defaultTaskScheduler();
        provider.initialize();
        maintenance.initialize();
        var started = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var expired = new CountDownLatch(1);
        try {
            provider.execute(() -> {
                started.countDown();
                try { release.await(10, TimeUnit.SECONDS); }
                catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
            });
            assertThat(started.await(5, TimeUnit.SECONDS)).isTrue();
            maintenance.execute(expired::countDown);
            assertThat(expired.await(5, TimeUnit.SECONDS)).isTrue();
            var annotation = PaymentReconciliationScheduler.class.getMethod("run")
                    .getAnnotation(Scheduled.class);
            assertThat(annotation.scheduler()).isEqualTo("paymentTaskScheduler");
        } finally { release.countDown(); provider.shutdown(); maintenance.shutdown(); }
    }

    @Test void requiresBothFeatureFlagsAndStrongSigningSecret() {
        runner.run(c -> assertThat(c).hasNotFailed().doesNotHaveBean(ReconcilePaymentsUseCase.class).doesNotHaveBean(PaymentWebhookController.class));
        runner.withPropertyValues("app.payments.enabled=true").run(c -> assertThat(c).doesNotHaveBean(ReconcilePaymentsUseCase.class));
        runner.withPropertyValues("app.payments.settlement-enabled=true").run(c -> assertThat(c).doesNotHaveBean(ReconcilePaymentsUseCase.class));
        var enabled = runner.withPropertyValues("app.payments.enabled=true", "app.payments.settlement-enabled=true");
        enabled.withPropertyValues("app.payments.webhook-secret=short").run(c -> assertThat(c).hasFailed());
        enabled.withPropertyValues("app.payments.webhook-secret=local-signature-test-fixture-32-characters").run(c -> assertThat(c).hasNotFailed()
                .hasSingleBean(ReconcilePaymentsUseCase.class).hasSingleBean(PaymentWebhookController.class).hasSingleBean(MercadoPagoWebhookSignature.class));
    }
}
