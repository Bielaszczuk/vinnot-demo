package com.vinnot.payment.infrastructure.config;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.payment.application.port.in.ConnectPaymentAccountUseCase;
import com.vinnot.payment.application.port.in.GetCommissionPolicyUseCase;
import com.vinnot.payment.application.port.out.CurrentCommissionPolicy;
import com.vinnot.payment.application.port.out.PaymentAccountStore;
import com.vinnot.payment.application.service.ConnectPaymentAccountService;
import com.vinnot.payment.application.service.GetCommissionPolicyService;
import com.vinnot.payment.application.service.PaymentAccountNoticeService;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.infrastructure.persistence.PaymentStorageEnvironment;
import com.vinnot.payment.infrastructure.gateway.MercadoPagoAuthorizationAdapter;
import com.vinnot.payment.infrastructure.persistence.PostgresPaymentAccountStore;
import com.vinnot.payment.infrastructure.security.PaymentCredentialCipher;
import com.vinnot.payment.infrastructure.security.SecureAuthorizationProof;
import com.vinnot.shared.infrastructure.http.DeadlineHttpRequestFactory;
import com.vinnot.user.application.port.out.UserRepositoryPort;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import com.vinnot.payment.application.port.in.RenewPaymentCredentialsUseCase;
import com.vinnot.payment.application.service.RenewPaymentCredentialsService;
import com.vinnot.payment.application.service.RenewalFailureRecorder;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Explicit opt-in. Sandbox remains default; LIVE enables verified real organizers. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "app.payments.enabled", havingValue = "true")
public class PaymentSandboxConfiguration {
    private static final int BODY_LIMIT = 64 * 1024;
    private static final int CONNECT_SECONDS = 3;
    private static final int READ_SECONDS = 8;

    @Bean
    public PaymentExecutionPolicy paymentExecutionPolicy(
            @Value("${app.payments.environment:SANDBOX}")
                    PaymentExecutionPolicy.Environment environment,
            @Value("${app.payments.pilot-seller-id:}") String sellerId,
            @Value("${app.payments.platform-owner-id:}") String platformOwnerId) {
        return new PaymentExecutionPolicy(environment, sellerId, platformOwnerId);
    }

    /** New checkouts are priced with this policy; the defaults keep the original 3% terms. */
    @Bean
    public CurrentCommissionPolicy currentCommissionPolicy(
            @Value("${app.payments.commission.basis-points:300}") int basisPoints,
            @Value("${app.payments.commission.policy:VINNOT_3_PERCENT_V1}") String policyId) {
        return new ConfiguredCommissionPolicy(basisPoints, policyId);
    }

    @Bean
    public GetCommissionPolicyUseCase getCommissionPolicyUseCase(CurrentCommissionPolicy policy) {
        return new GetCommissionPolicyService(policy);
    }

    @Bean
    public PostgresPaymentAccountStore paymentAccountStore(
            JdbcTemplate jdbc,
            @Value("${app.payments.encryption-key}") String encryptionKey,
            PaymentExecutionPolicy policy) {
        return new PostgresPaymentAccountStore(
                jdbc, new PaymentCredentialCipher(encryptionKey), PaymentStorageEnvironment.resolve(policy.environment()));
    }

    @Bean
    public MercadoPagoAuthorizationAdapter paymentAuthorizationGateway(
            @Value("${app.payments.client-id}") String clientId,
            @Value("${app.payments.client-secret}") String clientSecret,
            @Value("${app.payments.redirect-uri}") URI redirectUri,
            PaymentExecutionPolicy policy) {
        if (!clientId.matches("[1-9][0-9]+")
                || clientSecret.isBlank()
                || !"https".equals(redirectUri.getScheme())
                || Objects.isNull(redirectUri.getHost())
                || Objects.nonNull(redirectUri.getUserInfo())
                || Objects.nonNull(redirectUri.getQuery())
                || Objects.nonNull(redirectUri.getFragment())) {
            throw new IllegalArgumentException(
                    "Payment OAuth requires credentials and an exact HTTPS callback URL");
        }
        var client =
                RestClient.builder()
                        .baseUrl("https://api.mercadopago.com")
                        .requestFactory(
                                new DeadlineHttpRequestFactory(
                                        Duration.ofSeconds(CONNECT_SECONDS),
                                        Duration.ofSeconds(READ_SECONDS),
                                        BODY_LIMIT,
                                        BODY_LIMIT))
                        .build();
        var clock = Clock.systemUTC();
        return new MercadoPagoAuthorizationAdapter(
                client, clientId, clientSecret, redirectUri, clock, policy);
    }

    @Bean
    public PaymentAccountNoticeService paymentAccountNoticeService(
            NotificationPort notifications, PushNotificationPort pushes) {
        return new PaymentAccountNoticeService(notifications, pushes);
    }

    @Bean
    public ConnectPaymentAccountUseCase connectPaymentAccountUseCase(
            PaymentAccountStore store,
            UserRepositoryPort users,
            MercadoPagoAuthorizationAdapter gateway,
            PaymentAccountNoticeService notices) {
        return new ConnectPaymentAccountService(
                store, gateway, new SecureAuthorizationProof(), users, notices, Clock.systemUTC());
    }

    @Bean
    public RenewalFailureRecorder renewalFailureRecorder(
            PostgresPaymentAccountStore store, PaymentAccountNoticeService notices) {
        return new RenewalFailureRecorder(store, notices);
    }

    @Bean
    public RenewPaymentCredentialsUseCase
            renewPaymentCredentials(
                    PostgresPaymentAccountStore store,
                    MercadoPagoAuthorizationAdapter gateway,
                    RenewalFailureRecorder failures) {
        return new RenewPaymentCredentialsService(
                store, gateway, failures, Clock.systemUTC());
    }

    @Bean(name = "paymentCredentialTaskScheduler")
    public ThreadPoolTaskScheduler
            paymentCredentialTaskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("payment-credentials-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
}
