package com.vinnot.payment.infrastructure.config;

import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.infrastructure.persistence.PaymentStorageEnvironment;
import com.vinnot.payment.application.port.in.ApplyProviderPaymentUseCase;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.CurrentCommissionPolicy;
import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import com.vinnot.payment.application.port.out.PaymentLedger;
import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.port.out.PaymentProviderGateway;
import com.vinnot.payment.application.service.ApplyProviderPaymentService;
import com.vinnot.payment.application.service.EventCheckoutReservationService;
import com.vinnot.payment.application.service.ReconcilePaymentsService;
import com.vinnot.payment.application.service.RecordPaymentNotificationService;
import com.vinnot.payment.application.service.RefundRejectionRecorder;
import com.vinnot.payment.application.service.RequestPaymentRefundService;
import com.vinnot.payment.application.service.PaymentNoticeService;
import com.vinnot.payment.infrastructure.gateway.MercadoPagoPaymentAdapter;
import com.vinnot.payment.infrastructure.persistence.PostgresCheckoutAttemptStore;
import com.vinnot.payment.infrastructure.persistence.PostgresPaymentLedger;
import com.vinnot.payment.infrastructure.persistence.PostgresPaymentReconciliationQueue;
import com.vinnot.payment.infrastructure.persistence.PostgresRefundStore;
import com.vinnot.payment.infrastructure.security.MercadoPagoWebhookSignature;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.shared.infrastructure.http.DeadlineHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;
import java.time.Clock;
import java.time.Duration;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.payment.application.port.in.GetOrganizerPaymentsUseCase;
import com.vinnot.payment.application.port.in.GetPaymentReceiptUseCase;
import com.vinnot.payment.application.port.out.PaymentReceiptAccess;
import com.vinnot.payment.application.service.GetOrganizerPaymentsService;
import com.vinnot.payment.application.service.GetPaymentReceiptService;
import com.vinnot.payment.infrastructure.persistence.JdbcEventTimeZones;
import com.vinnot.payment.infrastructure.persistence.PostgresOrganizerPaymentReader;
import com.vinnot.payment.infrastructure.persistence.PostgresPaymentReceiptReader;
import com.vinnot.payment.infrastructure.security.EncryptedPaymentReceiptAccess;
import com.vinnot.payment.infrastructure.security.PaymentCredentialCipher;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = {"app.payments.enabled", "app.payments.settlement-enabled"}, havingValue = "true")
public class PaymentSettlementConfiguration {
    private static final int CONNECT_SECONDS = 3;
    private static final int READ_SECONDS = 8;
    private static final int BODY_LIMIT = 131072;
    private static final int DEFAULT_SCHEDULING_POOL_SIZE = 4;
    /**
     * The payment scheduler below replaces Spring Boot's default one, so it takes the same size setting: several threads,
     * so one slow job (an outbox drain, a receipts check) never holds the others back (#405).
     */
    @Value("${spring.task.scheduling.pool.size:4}")
    private int schedulingPoolSize = DEFAULT_SCHEDULING_POOL_SIZE;

    // Provider latency must not delay reservation expiry, retention or the shared outbox.
    @Bean(name = "paymentTaskScheduler")
    public ThreadPoolTaskScheduler paymentTaskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("payment-reconciliation-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }

    @Bean(name = "taskScheduler")
    @ConditionalOnMissingBean(name = "taskScheduler")
    public ThreadPoolTaskScheduler defaultTaskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(Math.max(1, schedulingPoolSize));
        scheduler.setThreadNamePrefix("scheduled-maintenance-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }

    @Bean public CheckoutAttemptStore checkoutAttemptStore(JdbcTemplate jdbc, PaymentExecutionPolicy policy) { return new PostgresCheckoutAttemptStore(jdbc, PaymentStorageEnvironment.resolve(policy.environment())); }
    @Bean public PaymentLedger paymentLedger(JdbcTemplate jdbc) { return new PostgresPaymentLedger(jdbc); }
    @Bean public PaymentReconciliationQueue paymentQueue(JdbcTemplate jdbc, PaymentExecutionPolicy policy) { return new PostgresPaymentReconciliationQueue(jdbc, PaymentStorageEnvironment.resolve(policy.environment())); }
    @Bean public RefundStore refundStore(JdbcTemplate jdbc) { return new PostgresRefundStore(jdbc); }
    @Bean public MercadoPagoWebhookSignature webhookSignature(@Value("${app.payments.webhook-secret}") String secret) {
        return new MercadoPagoWebhookSignature(secret, Clock.systemUTC());
    }
    @Bean public PaymentProviderGateway paymentProviderGateway(PaymentExecutionPolicy policy) {
        return new MercadoPagoPaymentAdapter(RestClient.builder().baseUrl("https://api.mercadopago.com")
                .requestFactory(new DeadlineHttpRequestFactory(Duration.ofSeconds(CONNECT_SECONDS), Duration.ofSeconds(READ_SECONDS), BODY_LIMIT, BODY_LIMIT)).build(), policy);
    }
    @Bean public EventCheckoutReservationService checkoutReservationService(EventRepositoryPort events,
            EventRegistrationRepositoryPort registrations, UserRepositoryPort users, SellerCredentialReader credentials, CheckoutAttemptStore attempts, PaymentExecutionPolicy policy,
            CurrentCommissionPolicy commission) {
        return new EventCheckoutReservationService(events, registrations, users, credentials, attempts, Clock.systemUTC(), policy, commission);
    }
    @Bean public ApplyProviderPaymentService applyProviderPaymentService(EventRepositoryPort events,
            EventRegistrationRepositoryPort registrations, PaymentLedger ledger, RefundStore refunds,
            PaymentReconciliationQueue queue, EventCheckoutReservationService eligibility, PaymentNoticeService notices) {
        return new ApplyProviderPaymentService(events, registrations, ledger, refunds, queue, eligibility, Clock.systemUTC(), notices);
    }
    @Bean public PaymentNoticeService paymentNoticeService(NotificationPort notifications,
            JdbcTemplate jdbc, PushNotificationPort pushes) {
        return new PaymentNoticeService(notifications, new JdbcEventTimeZones(jdbc), pushes);
    }
    @Bean public ReconcilePaymentsService reconciliationService(CheckoutAttemptStore attempts, PaymentReconciliationQueue queue,
            PaymentLedger ledger, SellerCredentialReader credentials, PaymentProviderGateway provider,
            ApplyProviderPaymentUseCase settlement, RefundStore refunds, RefundRejectionRecorder rejections) {
        return new ReconcilePaymentsService(attempts, queue, ledger, credentials, provider, settlement, refunds, rejections,
                Clock.systemUTC());
    }
    @Bean public RefundRejectionRecorder refundRejectionRecorder(RefundStore refunds, PaymentNoticeService notices) {
        return new RefundRejectionRecorder(refunds, notices);
    }
    @Bean public RecordPaymentNotificationService paymentNotifications(PaymentReconciliationQueue queue) {
        return new RecordPaymentNotificationService(queue);
    }
    @Bean public GetOrganizerPaymentsUseCase organizerPayments(
            JdbcTemplate jdbc, PaymentExecutionPolicy policy, EventRepositoryPort events, UserRepositoryPort users) {
        return new GetOrganizerPaymentsService(
                new PostgresOrganizerPaymentReader(jdbc, PaymentStorageEnvironment.resolve(policy.environment())), events, users);
    }
    @Bean public RequestPaymentRefundService requestRefundService(CheckoutAttemptStore attempts, EventRepositoryPort events,
            EventRegistrationRepositoryPort registrations, UserRepositoryPort users, PaymentLedger ledger, RefundStore refunds, PaymentReconciliationQueue queue,
            PaymentNoticeService notices) {
        return new RequestPaymentRefundService(attempts, events, registrations, users, ledger, refunds, queue, notices);
    }
    @Bean public PaymentReceiptAccess paymentReceiptAccess(
            @Value("${app.payments.encryption-key}") String encryptionKey, PaymentExecutionPolicy policy) {
        return new EncryptedPaymentReceiptAccess(
                new PaymentCredentialCipher(encryptionKey), Clock.systemUTC(), PaymentStorageEnvironment.resolve(policy.environment()).name());
    }
    @Bean public GetPaymentReceiptUseCase paymentReceipts(
            JdbcTemplate jdbc, PaymentExecutionPolicy policy, PaymentReceiptAccess access) {
        return new GetPaymentReceiptService(access,
                new PostgresPaymentReceiptReader(jdbc, PaymentStorageEnvironment.resolve(policy.environment()).name()));
    }
}
