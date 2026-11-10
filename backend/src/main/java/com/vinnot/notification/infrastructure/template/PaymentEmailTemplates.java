package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The payment emails share one bundle per language ({@code email/payment_es} and {@code email/payment_en}); the
 * organizer's Mercado Pago connection notices use {@code email/payment_account_*}.
 */
@Configuration
public class PaymentEmailTemplates {
    @Bean
    NotificationTemplate paymentReceiptTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new PaymentNoticeTemplate(NotificationType.PAYMENT_RECEIPT, "receipt", brand, website);
    }

    @Bean
    NotificationTemplate paymentRefundRequestedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new PaymentNoticeTemplate(NotificationType.PAYMENT_REFUND_REQUESTED, "refundRequested", brand, website);
    }

    @Bean
    NotificationTemplate paymentRefundedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new PaymentNoticeTemplate(NotificationType.PAYMENT_REFUNDED, "refunded", brand, website);
    }

    @Bean
    NotificationTemplate paymentChargebackTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new PaymentNoticeTemplate(NotificationType.PAYMENT_CHARGEBACK, "chargeback", brand, website);
    }

    @Bean
    NotificationTemplate paymentRefundRejectedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new PaymentNoticeTemplate(NotificationType.PAYMENT_REFUND_REJECTED, "refundRejected", brand, website);
    }

    @Bean
    NotificationTemplate paymentAccountConnectedTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new PaymentAccountNoticeTemplate(NotificationType.PAYMENT_ACCOUNT_CONNECTED, "connected", brand, website);
    }

    @Bean
    NotificationTemplate paymentAccountReconnectTemplate(BrandedEmailTemplate brand, @Value("${app.auth.frontend-base-url}") String website) {
        return new PaymentAccountNoticeTemplate(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED, "reconnect", brand, website);
    }
}
