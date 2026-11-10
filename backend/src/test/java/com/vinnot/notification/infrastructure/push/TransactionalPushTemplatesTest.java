package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Properties;
import com.vinnot.wine.domain.valueobject.WineType;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransactionalPushTemplatesTest {
    private static final String REGISTRATION = "6f1c2b9e-0d3a-4c4e-9a51-1c0d6b8e2f10";

    @Test
    void aRegistrationPushNamesTheEventAndOpensTheTicket() {
        PushContent content = new EventRegistrationPushTemplate().render(NotificationLocale.EN,
                registration("CONFIRMED", "APPROVED"));
        assertThat(content).isEqualTo(new PushContent("Registration confirmed",
                "Malbec tasting: your ticket is ready in the app.", "/my-tickets/" + REGISTRATION));
        assertThat(new EventRegistrationPushTemplate().render(NotificationLocale.ES, registration("REQUESTED", "PENDING")))
                .extracting(PushContent::title, PushContent::body)
                .containsExactly("Inscripción recibida", "Malbec tasting: el organizador revisará tu solicitud y te avisará.");
    }

    @Test
    void aDeclinedReportedOrRefundedPaymentLeadsOverTheStatus() {
        var template = new EventRegistrationPushTemplate();
        assertThat(template.render(NotificationLocale.EN, registration("AWAITING_PAYMENT", "REJECTED")).title())
                .isEqualTo("Payment declined");
        assertThat(template.render(NotificationLocale.ES, registration("AWAITING_PAYMENT", "REPORTED")).title())
                .isEqualTo("Pago en revisión");
        assertThat(template.render(NotificationLocale.EN, registration("CANCELLED", "REFUNDED")).title())
                .isEqualTo("Payment refunded");
    }

    @Test
    void aStatusWithoutItsOwnCopyGetsANeutralUpdate() {
        assertThat(new EventRegistrationPushTemplate().render(NotificationLocale.EN, registration("ARCHIVED", "PENDING")))
                .extracting(PushContent::title, PushContent::body)
                .containsExactly("Registration update", "Malbec tasting: there is an update on your registration.");
    }

    @Test
    void aTitleThatLooksLikeAPlaceholderStaysLiteralAndMissingDataFails() {
        assertThat(new EventRegistrationPushTemplate().render(NotificationLocale.EN, Map.of("title", "{event}",
                "registrationId", REGISTRATION, "status", "CONFIRMED", "paymentStatus", "APPROVED")).body())
                .startsWith("{event}:");
        assertThatThrownBy(() -> new EventRegistrationPushTemplate().render(NotificationLocale.EN, Map.of("status", "CONFIRMED")))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void aChargebackTellsTheOrganizerAndOpensTheirEvents() {
        assertThat(new PaymentChargebackPushTemplate().render(NotificationLocale.ES, Map.of("title", "Cata")))
                .isEqualTo(new PushContent("Pago revertido",
                        "Cata: el banco de un comprador revirtió un pago. Revisalo en tus eventos.", "/partner/events"));
    }

    @Test
    void aBrokenPaymentConnectionAsksTheOrganizerToReconnectFromTheirEvents() {
        assertThat(new PaymentReconnectPushTemplate().render(NotificationLocale.ES, Map.of("reason", "REVOKED")))
                .isEqualTo(new PushContent("Volvé a conectar Mercado Pago",
                        "Por ahora no podés cobrar entradas. Conectá tu cuenta otra vez para seguir vendiendo.",
                        "/partner/events"));
        assertThat(new PaymentReconnectPushTemplate().render(NotificationLocale.EN, Map.of()).title())
                .isEqualTo("Connect Mercado Pago again");
    }

    @Test
    void aCancelledEventOpensTheTicketsAndAChangeOpensTheEventNamingWhatChanged() {
        assertThat(new EventCancelledPushTemplate().render(NotificationLocale.EN, Map.of("title", "Cata")))
                .isEqualTo(new PushContent("Event cancelled", "Cata has been cancelled. Your ticket has the details.", "/my-tickets"));
        var changed = new EventChangedPushTemplate();
        assertThat(changed.render(NotificationLocale.ES, Map.of("title", "Cata", "eventId", REGISTRATION, "change", "DATE")))
                .isEqualTo(new PushContent("Nueva fecha para tu evento",
                        "Cata: cambió la fecha o el horario. Revisá los detalles actualizados.", "/events/" + REGISTRATION));
        assertThat(changed.render(NotificationLocale.EN, Map.of("title", "Cata", "eventId", REGISTRATION, "change", "VENUE")).title())
                .isEqualTo("New venue for your event");
        assertThat(changed.render(NotificationLocale.EN, Map.of("title", "Cata", "eventId", REGISTRATION, "change", "ODD")).title())
                .isEqualTo("Your event has changed");
    }

    @Test
    void remindersShowTheStartInTheVenueZoneAndTheVenueWhenKnown() {
        var template = new EventReminderPushTemplate();
        Map<String, String> day = Map.of("title", "Cata", "registrationId", REGISTRATION, "window", "DAY_BEFORE",
                "startDate", "2026-10-21T23:00:00Z", "timeZone", "America/Argentina/Buenos_Aires", "venue", "Bodega Norte");
        PushContent content = template.render(NotificationLocale.EN, day);
        assertThat(content.title()).isEqualTo("Coming up: Cata");
        assertThat(content.body()).startsWith("Starts Oct 21, 2026, 8:00").endsWith(" at Bodega Norte. Your ticket is ready in the app.");
        assertThat(content.route()).isEqualTo("/my-tickets/" + REGISTRATION);
        Map<String, String> soon = new HashMap<>(day);
        soon.put("window", "SOON");
        soon.remove("venue");
        assertThat(template.render(NotificationLocale.ES, soon)).extracting(PushContent::title, PushContent::body)
                .containsExactly("Falta poco: Cata", "Empieza a las 20:00. Tené tu entrada a mano.");
        soon.put("timeZone", "Not/AZone");
        assertThat(template.render(NotificationLocale.ES, soon).body()).isEqualTo("Empieza a las 23:00. Tené tu entrada a mano.");
    }

    @Test
    void theOrganizerDigestListsOnlyTheActivityThereIsWithPluralsAndOpensTheirEvents() {
        var template = new OrganizerDigestPushTemplate();
        assertThat(template.render(NotificationLocale.EN, Map.of("title", "Cata", "confirmed", "3", "requested", "1", "cancelled", "0")))
                .isEqualTo(new PushContent("Activity on your event", "Cata: 3 new registrations · 1 awaiting your approval.",
                        "/partner/events"));
        assertThat(template.render(NotificationLocale.ES, Map.of("title", "Cata", "confirmed", "1", "requested", "0", "cancelled", "2")).body())
                .isEqualTo("Cata: 1 inscripción nueva · 2 cancelaciones.");
        assertThat(template.render(NotificationLocale.ES, Map.of("title", "Cata")).body()).isEqualTo("Cata: novedades en las inscripciones.");
    }

    @Test
    void aNewEventNearbyNamesTheEventPlaceAndStartAndOpensTheEvent() {
        var template = new EventNearbyPushTemplate();
        Map<String, String> data = new HashMap<>(Map.of("title", "Cata", "eventId", REGISTRATION,
                "startDate", "2026-10-21T23:00:00Z", "timeZone", "America/Argentina/Buenos_Aires", "place", "Mendoza"));
        PushContent content = template.render(NotificationLocale.ES, data);
        assertThat(content.title()).isEqualTo("Nuevo evento cerca tuyo");
        assertThat(content.body()).startsWith("Cata en Mendoza, 21 oct 2026").endsWith("Mirá los detalles y reservá tu lugar.");
        assertThat(content.route()).isEqualTo("/events/" + REGISTRATION);
        data.remove("place");
        assertThat(template.render(NotificationLocale.EN, data).body()).startsWith("Cata, Oct 21, 2026")
                .endsWith("See the details and save your place.");
    }

    @Test
    void aWineRecommendationSaysWhyItWasPickedAndOpensTheWine() {
        var template = new WineRecommendationPushTemplate();
        PushContent byGrape = template.render(NotificationLocale.ES,
                Map.of("wineId", REGISTRATION, "wine", "Gran Malbec 2021", "reasonKind", "GRAPE", "reason", "Malbec"));
        assertThat(byGrape).isEqualTo(new PushContent("Un vino para vos",
                "Gran Malbec 2021. Te lo sugerimos porque puntuás bien el Malbec.", "/wines/" + REGISTRATION));
        assertThat(template.render(NotificationLocale.EN,
                Map.of("wineId", REGISTRATION, "wine", "Rosé", "reasonKind", "TYPE", "reason", "ROSE")).body())
                .isEqualTo("Rosé. Picked for you because you rate rosé wines highly.");
    }

    @Test
    void everyWineTypeHasRecommendationCopyInBothLanguages() throws IOException {
        for (String language : new String[] {"es", "en"}) {
            Properties copy = load(Bundle.recommendation, language);
            for (var type : WineType.values()) {
                assertThat(copy.getProperty("type." + type.name())).as(language + " " + type).isNotBlank();
            }
        }
    }

    @ParameterizedTest
    @EnumSource(Bundle.class)
    void everyBundleHasTheSameKeysInBothLanguagesAndAProfessionalRegister(Bundle bundle) throws IOException {
        Properties es = load(bundle, "es");
        Properties en = load(bundle, "en");
        assertThat(es.stringPropertyNames()).isEqualTo(en.stringPropertyNames());
        for (Properties copy : new Properties[] {es, en}) {
            copy.stringPropertyNames().forEach(key -> assertThat(copy.getProperty(key))
                    .as(bundle + " " + key).doesNotContain("!", "¡").doesNotContainPattern("[\\x{1F300}-\\x{1FAFF}\\x{2600}-\\x{27BF}]"));
        }
    }

    enum Bundle { registration, payment, event, reminder, organizer, nearby, recommendation }

    private static Properties load(Bundle bundle, String language) throws IOException {
        Properties properties = new Properties();
        try (InputStream input = TransactionalPushTemplatesTest.class.getResourceAsStream(
                "/push/" + bundle.name() + "_" + language + ".properties")) {
            properties.load(new InputStreamReader(input, StandardCharsets.UTF_8));
        }
        return properties;
    }

    private static Map<String, String> registration(String status, String paymentStatus) {
        return Map.of("title", "Malbec tasting", "registrationId", REGISTRATION, "status", status, "paymentStatus", paymentStatus);
    }
}
