package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SupportRequestReceivedTemplateTest {
    private static final String REQUEST = "11111111-2222-3333-4444-555555555555";
    private final NotificationTemplate template = new SupportEmailTemplates()
            .supportRequestReceivedTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");

    @Test
    void theRequesterGetsTheReferenceAndTopicInTheirLanguageWithoutTheTypedName() {
        RenderedNotification spanish = template.render(request(NotificationLocale.ES, "appeal"));
        assertThat(spanish.subject()).isEqualTo("Recibimos tu consulta · VIN-555555555555");
        assertThat(spanish.text()).doesNotContain("Lucía");
        assertThat(spanish.html()).doesNotContain("Lucía");
        assertThat(spanish.text()).contains("Hola,", "Referencia: VIN-555555555555", "Motivo: Revisar una decisión",
                "Ir a contacto: " + GoldenEmails.SITE + "/contact");

        RenderedNotification english = template.render(request(NotificationLocale.EN, "unknown"));
        assertThat(english.subject()).isEqualTo("We received your request · VIN-555555555555");
        assertThat(english.text()).contains("Topic: Other", "will reply by email");
        assertThat(template.type()).isEqualTo(NotificationType.SUPPORT_REQUEST_RECEIVED);
        assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
    }

    private static NotificationRequest request(NotificationLocale locale, String subject) {
        return NotificationRequest.of(NotificationType.SUPPORT_REQUEST_RECEIVED, NotificationRecipient.address("lucia@example.org", "Lucía"),
                locale, Map.of("requestId", REQUEST, "subject", subject), "support-received:" + REQUEST);
    }
}
