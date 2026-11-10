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

class TermsUpdatedTemplateTest {
    private final NotificationTemplate template = new AccountEmailTemplates()
            .termsUpdatedTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");

    @Test
    void theUserLearnsFromWhichLocalDateTheNewTermsAreRequired() {
        RenderedNotification spanish = template.render(request(NotificationLocale.ES, "America/Argentina/Buenos_Aires"));
        assertThat(spanish.subject()).isEqualTo("Actualizamos los términos y condiciones de Vinnot");
        assertThat(spanish.text()).contains("desde el 30 de noviembre de 2026 vas a tener que aceptarlos",
                "Leer los términos: " + GoldenEmails.SITE + "/terms");

        RenderedNotification english = template.render(request(NotificationLocale.EN, "Not/AZone"));
        assertThat(english.text()).contains("from November 30, 2026 you will need to accept them");
        assertThat(template.type()).isEqualTo(NotificationType.TERMS_UPDATED);
    }

    private static NotificationRequest request(NotificationLocale locale, String zone) {
        return NotificationRequest.of(NotificationType.TERMS_UPDATED, NotificationRecipient.user(UUID.randomUUID()), locale,
                Map.of("version", "2026-11-01.1", "requiredFrom", "2026-12-01T02:00:00Z", "timeZone", zone), "terms-updated:1");
    }
}
