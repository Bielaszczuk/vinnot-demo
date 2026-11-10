package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NewsletterTemplateTest {
    private static final String UNSUBSCRIBE = "https://vinnot.example/unsubscribe?token=abc";
    private final NewsletterTemplate template = new NewsletterTemplate(GoldenEmails.brand());

    @Test
    void wrapsTeamTextInThePromotionalLayoutWithAnUnsubscribeLink() {
        var message = template.render(request(NotificationLocale.ES, Map.of(
                NotificationType.SUBJECT, "Novedades de octubre",
                NotificationType.BODY, "Primer párrafo.\n\nSegundo <b>párrafo</b>.",
                NotificationType.UNSUBSCRIBE_URL, UNSUBSCRIBE)));

        assertThat(message.subject()).isEqualTo("Novedades de octubre");
        assertThat(message.html())
                .contains("Hola Ana,", "Primer párrafo.", "Segundo &lt;b&gt;párrafo&lt;/b&gt;.")
                .contains("Recibís este correo porque aceptaste recibir novedades de Vinnot.")
                .contains("href=\"" + UNSUBSCRIBE + "\"", "Darte de baja")
                .doesNotContain("Este correo está relacionado con tu cuenta", "<b>párrafo</b>");
        assertThat(message.text()).contains("Primer párrafo.", "Darte de baja: " + UNSUBSCRIBE)
                .contains("Recibís este correo porque aceptaste recibir novedades de Vinnot.");
    }

    @Test
    void rendersTheAdministratorsFormattingWithEscapedTextOnly() {
        var message = template.render(request(NotificationLocale.ES, Map.of(
                NotificationType.SUBJECT, "Vendimia",
                NotificationType.BODY, "## Llegó la <vendimia>\nCatas **todo el mes** en [la agenda](https://vinnot.example/events)."
                        + "\n\n[[Ver eventos]](https://vinnot.example/events)",
                NotificationType.UNSUBSCRIBE_URL, UNSUBSCRIBE)));

        assertThat(message.html()).contains(">Llegó la &lt;vendimia&gt;</h2>", "<strong style=\"color:#382b33;\">todo el mes</strong>",
                "href=\"https://vinnot.example/events\" style=\"color:#8d2349;text-decoration:underline;\">la agenda</a>",
                ">Ver eventos</a>").doesNotContain("<vendimia>", "**", "[[");
        assertThat(message.text()).contains("Llegó la <vendimia>", "la agenda (https://vinnot.example/events)",
                "Ver eventos: https://vinnot.example/events");
    }

    @Test
    void rendersEnglishCopy() {
        var message = template.render(request(NotificationLocale.EN, Map.of(
                NotificationType.SUBJECT, "News", NotificationType.BODY, "Body",
                NotificationType.UNSUBSCRIBE_URL, UNSUBSCRIBE)));

        assertThat(message.html()).contains("Hi Ana,", "Unsubscribe",
                "You receive this email because you agreed to receive news from Vinnot.");
        assertThat(message.text()).contains("Unsubscribe: " + UNSUBSCRIBE);
    }

    @Test
    void refusesToRenderWithoutTheUnsubscribeLink() {
        assertThatThrownBy(() -> template.render(request(NotificationLocale.ES, Map.of(
                NotificationType.SUBJECT, "News", NotificationType.BODY, "Body"))))
                .hasMessageContaining(NotificationType.UNSUBSCRIBE_URL);
    }

    private static NotificationRequest request(NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(NotificationType.NEWSLETTER, NotificationRecipient.address("ana@example.test", "Ana"),
                locale, data, "newsletter:1");
    }
}
