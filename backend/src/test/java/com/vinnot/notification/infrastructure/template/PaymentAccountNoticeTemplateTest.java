package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentAccountNoticeTemplateTest {
    private final PaymentEmailTemplates templates = new PaymentEmailTemplates();

    @Test
    void aConnectionConfirmsTheOrganizerCanSellAndLinksToPayments() {
        NotificationTemplate template = templates.paymentAccountConnectedTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");
        RenderedNotification es = template.render(request(NotificationType.PAYMENT_ACCOUNT_CONNECTED, NotificationLocale.ES, Map.of()));
        assertThat(es.subject()).isEqualTo("Conectaste Mercado Pago a Vinnot");
        assertThat(es.text()).contains("Ya podés cobrar entradas", "Ver pagos: " + GoldenEmails.SITE + "/partner/payments");
        assertThat(template.type()).isEqualTo(NotificationType.PAYMENT_ACCOUNT_CONNECTED);
        assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
    }

    @Test
    void aReconnectionExplainsWhyAndAnUnknownReasonReadsAsExpired() {
        NotificationTemplate template = templates.paymentAccountReconnectTemplate(GoldenEmails.brand(), GoldenEmails.SITE);
        RenderedNotification revoked = template.render(request(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED,
                NotificationLocale.ES, Map.of("reason", "REVOKED")));
        assertThat(revoked.subject()).isEqualTo("Volvé a conectar Mercado Pago");
        assertThat(revoked.text()).contains("Mercado Pago retiró el permiso",
                "Conectar Mercado Pago: " + GoldenEmails.SITE + "/partner/payments");

        RenderedNotification expired = template.render(request(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED,
                NotificationLocale.EN, Map.of("reason", "EXPIRED")));
        assertThat(expired.text()).contains("Your Mercado Pago connection expired", "Tickets already sold are not affected.");
        assertThat(template.render(request(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED, NotificationLocale.EN,
                Map.of())).text()).isEqualTo(expired.text());
    }

    private static NotificationRequest request(NotificationType type, NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(type, NotificationRecipient.user(UUID.fromString("11111111-2222-3333-4444-555555555555")),
                locale, data, "payment-account:1");
    }
}
