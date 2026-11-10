package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WelcomeEmailTemplateTest {
    private static final String SITE = "https://vinnot.example";
    private final WelcomeEmailTemplate template = new WelcomeEmailTemplate(GoldenEmails.brand(), SITE + "/");

    @Test
    void welcomesInSpanishWithLinksToTheKeyAreasAndNoOffers() {
        var message = template.render(request(NotificationLocale.ES));

        assertThat(message.subject()).isEqualTo("Te damos la bienvenida a Vinnot");
        assertThat(message.html()).contains("Hola Ana,", "Descubre vinos", "Arma tu cava", "Encuentra eventos",
                "Recorre rutas del vino", "href=\"" + SITE + "/wines\"", "Explorar vinos", "Este correo está relacionado con tu cuenta")
                .doesNotContain("Darte de baja", "Recibís este correo porque aceptaste");
        assertThat(message.text()).contains(SITE + "/wines", SITE + "/cellar", SITE + "/events", SITE + "/wine-routes")
                .doesNotContain(SITE + "//");
    }

    @Test
    void rendersEnglishCopy() {
        var message = template.render(request(NotificationLocale.EN));

        assertThat(message.subject()).isEqualTo("Welcome to Vinnot");
        assertThat(message.html()).contains("Hi Ana,", "Discover wines", "Build your cellar", "Explore wines");
        assertThat(message.text()).contains("Cheers! The Vinnot team");
    }

    private static NotificationRequest request(NotificationLocale locale) {
        return NotificationRequest.of(NotificationType.ACCOUNT_WELCOME, NotificationRecipient.address("ana@example.test", "Ana"),
                locale, Map.of(), "welcome:test");
    }
}
