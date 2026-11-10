package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentNoticeTemplateTest {
    private static final String SITE = "https://vinnot.example";
    private static final String REGISTRATION = "11111111-2222-3333-4444-555555555555";
    private final PaymentEmailTemplates templates = new PaymentEmailTemplates();

    @Test
    void theReceiptShowsEventAmountLocalDateAndReferenceWithATicketLink() {
        var message = templates.paymentReceiptTemplate(GoldenEmails.brand(), SITE).render(request(NotificationType.PAYMENT_RECEIPT,
                NotificationLocale.ES, Map.of("paidAt", "2026-10-19T15:00:00Z", "timeZone", "America/Argentina/Buenos_Aires")));

        assertThat(message.subject()).isEqualTo("Recibo de tu pago para Cata");
        assertThat(message.html()).contains("Recibimos tu pago.", "Evento", "Cata", "Monto", "10.000,50 ARS", "Fecha de pago",
                "12:00", "America/Argentina/Buenos Aires", "Referencia de pago", "77",
                "href=\"" + SITE + "/my-tickets/" + REGISTRATION + "\"", "Ver mi entrada");
        assertThat(message.text()).contains("Monto: 10.000,50 ARS", "Referencia de pago: 77");
    }

    @Test
    void refundWordingFollowsTheAudience() {
        var template = templates.paymentRefundRequestedTemplate(GoldenEmails.brand(), SITE);
        var buyer = template.render(request(NotificationType.PAYMENT_REFUND_REQUESTED, NotificationLocale.EN, Map.of("audience", "BUYER")));
        var organizer = template.render(request(NotificationType.PAYMENT_REFUND_REQUESTED, NotificationLocale.EN,
                Map.of("audience", "ORGANIZER")));

        assertThat(buyer.subject()).isEqualTo("Refund in progress: Cata");
        assertThat(buyer.html()).contains("We started refunding your payment.", "10,000.50 ARS", "/my-tickets/" + REGISTRATION);
        assertThat(organizer.html()).contains("A refund was started for a payment to your event.", SITE + "/partner/payments",
                "View payments").doesNotContain("/my-tickets/");
    }

    @Test
    void aProcessedRefundLabelsTheReturnedAmount() {
        var message = templates.paymentRefundedTemplate(GoldenEmails.brand(), SITE).render(request(NotificationType.PAYMENT_REFUNDED,
                NotificationLocale.ES, Map.of("audience", "BUYER")));

        assertThat(message.html()).contains("Mercado Pago confirmó la devolución de tu pago.", "Monto devuelto");
    }

    @Test
    void aChargebackSendsTheOrganizerToTheirPayments() {
        var message = templates.paymentChargebackTemplate(GoldenEmails.brand(), SITE + "/").render(request(
                NotificationType.PAYMENT_CHARGEBACK, NotificationLocale.ES, Map.of()));

        assertThat(message.subject()).isEqualTo("Contracargo en un pago de Cata");
        assertThat(message.html()).contains("El banco del comprador revirtió un pago", SITE + "/partner/payments")
                .doesNotContain(SITE + "//");
    }

    @Test
    void aRejectedRefundTellsTheOrganizerWhyAndThatItCanBeRequestedAgain() {
        var template = templates.paymentRefundRejectedTemplate(GoldenEmails.brand(), SITE);
        var es = template.render(request(NotificationType.PAYMENT_REFUND_REJECTED, NotificationLocale.ES,
                Map.of("reason", "HTTP_428:insufficient_money_for_refund")));
        var en = template.render(request(NotificationType.PAYMENT_REFUND_REJECTED, NotificationLocale.EN,
                Map.of("reason", "HTTP_428:insufficient_money_for_refund")));

        assertThat(es.subject()).isEqualTo("Mercado Pago rechazó una devolución: Cata");
        assertThat(es.html()).contains("Mercado Pago rechazó la devolución de un pago de tu evento", "vuelve a solicitarla", "escríbenos desde Contacto",
                "10.000,50 ARS", "HTTP_428:insufficient_money_for_refund", SITE + "/partner/payments", "Ver pagos")
                .doesNotContain("/my-tickets/");
        assertThat(en.subject()).isEqualTo("Mercado Pago rejected a refund: Cata");
        assertThat(en.text()).contains("Mercado Pago rejected the refund of a payment to your event", "request it again", "write to us from Contact",
                "Mercado Pago reason: HTTP_428:insufficient_money_for_refund");
    }

    private static NotificationRequest request(NotificationType type, NotificationLocale locale, Map<String, String> extra) {
        Map<String, String> data = new HashMap<>(Map.of("title", "Cata", "amount", "10000.50", "currency", "ARS",
                "reference", "77", "registrationId", REGISTRATION));
        data.putAll(extra);
        return NotificationRequest.of(type, NotificationRecipient.address("ana@example.test", "Ana"), locale, data, "test");
    }
}
