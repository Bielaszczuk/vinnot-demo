package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/** S13: copy, deep link and length limits of every engagement push in Spanish and English. */
class EngagementPushTemplatesTest {
    private static final String WINE = "11111111-2222-3333-4444-555555555555";
    private static final int TWO_LINES = 80;
    private static final Pattern MOBILE_ROUTE = Pattern.compile("^/(?:(?:my-tickets|events|wines|routes|wine-routes|wineries)(?:/[A-Za-z0-9-]{1,64})?|partner)$");
    private final EngagementPushTemplates configuration = new EngagementPushTemplates();
    private final PushTemplateRegistry registry = new PushTemplateRegistry(List.of(configuration.tastePickPushTemplate(),
            configuration.routePickPushTemplate(), configuration.viewedNotRatedPushTemplate(), configuration.cellarCheckinPushTemplate(),
            configuration.weekendEventsPushTemplate(), configuration.wineryPickPushTemplate(), configuration.onboardingPushTemplate(),
            configuration.winbackPushTemplate(), configuration.milestonePushTemplate(), configuration.postEventPushTemplate()));

    @Test
    void everyEngagementTypeHasATemplateWhoseCategoryIsTheApprovedOne() {
        assertThat(registry.types()).containsExactlyInAnyOrder(Arrays.stream(NotificationType.values())
                .filter(NotificationType::engagement).filter(type -> type != NotificationType.WINE_RECOMMENDATION)
                .toArray(NotificationType[]::new));
        assertThat(NotificationType.TASTE_PICK.category().name()).isEqualTo("RECOMMENDATIONS");
        assertThat(NotificationType.ROUTE_PICK.category().name()).isEqualTo("RECOMMENDATIONS");
        assertThat(NotificationType.WINERY_PICK.category().name()).isEqualTo("RECOMMENDATIONS");
        assertThat(NotificationType.VIEWED_NOT_RATED.category().name()).isEqualTo("REMINDERS");
        assertThat(NotificationType.CELLAR_CHECKIN.category().name()).isEqualTo("REMINDERS");
        assertThat(NotificationType.ONBOARDING.category().name()).isEqualTo("REMINDERS");
        assertThat(NotificationType.WINBACK.category().name()).isEqualTo("REMINDERS");
        assertThat(NotificationType.POST_EVENT.category().name()).isEqualTo("REMINDERS");
        assertThat(NotificationType.WEEKEND_EVENTS.category().name()).isEqualTo("EVENTS_NEARBY");
        assertThat(NotificationType.MILESTONE.category().name()).isEqualTo("COMMUNITY");
        assertThat(Arrays.stream(NotificationType.values()).filter(NotificationType::engagement).noneMatch(NotificationType::emails))
                .isTrue();
    }

    @Test
    void theWineOfTheWeekNamesWhyItWasChosen() {
        Map<String, String> byType = Map.of("wineId", WINE, "wine", "Gran Malbec 2021", "reasonKind", "TYPE", "reason", "WHITE");
        assertThat(render(NotificationType.TASTE_PICK, NotificationLocale.ES, byType)).isEqualTo(new PushContent("Tu vino de la semana",
                "Gran Malbec 2021, porque te gustan los blancos.", "/wines/" + WINE));
        assertThat(render(NotificationType.TASTE_PICK, NotificationLocale.EN, byType).body())
                .isEqualTo("Gran Malbec 2021, because you like white wines.");
        Map<String, String> byGrape = Map.of("wineId", WINE, "wine", "Gran Malbec", "reasonKind", "GRAPE", "reason", "Malbec");
        assertThat(render(NotificationType.TASTE_PICK, NotificationLocale.ES, byGrape).body())
                .isEqualTo("Gran Malbec, porque te gusta el Malbec.");
        assertThat(render(NotificationType.TASTE_PICK, NotificationLocale.ES, Map.of("wineId", WINE, "wine", "X", "reasonKind", "TYPE",
                "reason", "NATURAL")).body()).as("an unknown type is shown as is").contains("los natural.");
    }

    @Test
    void routesWineriesAndEventsOpenTheirOwnScreen() {
        assertThat(render(NotificationType.ROUTE_PICK, NotificationLocale.ES, Map.of("routeId", "r1", "route", "Camino del Malbec",
                "region", "Mendoza"))).isEqualTo(new PushContent("Una ruta para vos",
                "Camino del Malbec, en Mendoza. Elegida según tus gustos.", "/routes/r1"));
        assertThat(render(NotificationType.ROUTE_PICK, NotificationLocale.EN, Map.of("routeId", "r1", "route", "Malbec Trail")).body())
                .isEqualTo("Malbec Trail. A wine route picked for your taste.");
        assertThat(render(NotificationType.WINERY_PICK, NotificationLocale.ES, Map.of("wineryId", "y1", "winery", "Bodega Norton",
                "region", "Luján de Cuyo"))).isEqualTo(new PushContent("Bodega de la semana",
                "Bodega Norton, en Luján de Cuyo. Conocé sus vinos.", "/wineries/y1"));
        assertThat(render(NotificationType.WINERY_PICK, NotificationLocale.EN, Map.of("wineryId", "y1", "winery", "Norton")).body())
                .isEqualTo("Norton. Discover its wines.");
        assertThat(render(NotificationType.WEEKEND_EVENTS, NotificationLocale.ES, Map.of("count", "1", "event", "Cata de otoño",
                "eventId", "e1"))).isEqualTo(new PushContent("Este finde cerca tuyo",
                "Cata de otoño, este finde en tu zona. Reservá tu lugar.", "/events/e1"));
        assertThat(render(NotificationType.WEEKEND_EVENTS, NotificationLocale.EN, Map.of("count", "4", "event", "Autumn tasting")))
                .isEqualTo(new PushContent("This weekend near you",
                        "4 events this weekend in your area. Pick yours.", "/events"));
        assertThat(render(NotificationType.POST_EVENT, NotificationLocale.ES, Map.of("eventId", "e1", "event", "Cata de otoño")))
                .isEqualTo(new PushContent("¿Cómo estuvo el evento?",
                        "¿Qué tal Cata de otoño? Puntuá los vinos que probaste.",
                        "/events/e1"));
    }

    @Test
    void remindersAboutTheAccountsOwnWines() {
        assertThat(render(NotificationType.VIEWED_NOT_RATED, NotificationLocale.ES, Map.of("wineId", WINE, "wine", "Gran Malbec")))
                .isEqualTo(new PushContent("¿Lo probaste?",
                        "¿Ya probaste Gran Malbec? Contanos qué te pareció.", "/wines/" + WINE));
        assertThat(render(NotificationType.CELLAR_CHECKIN, NotificationLocale.EN, Map.of("wineId", WINE, "wine", "Gran Malbec")))
                .isEqualTo(new PushContent("How was it?",
                        "Have you opened Gran Malbec? Add your rating.", "/wines/" + WINE));
    }

    @Test
    void onboardingStepsComeBackPushesAndMilestones() {
        assertThat(render(NotificationType.ONBOARDING, NotificationLocale.ES, Map.of("step", "1"))).isEqualTo(new PushContent(
                "Primeros pasos", "Escaneá una etiqueta y conocé el vino en segundos.", "/wines"));
        assertThat(render(NotificationType.ONBOARDING, NotificationLocale.EN, Map.of("step", "2")).body())
                .isEqualTo("Rate three wines and we will suggest the ones that suit you.");
        assertThat(render(NotificationType.ONBOARDING, NotificationLocale.ES, Map.of("step", "3", "wineId", WINE, "wine", "Gran Malbec")))
                .isEqualTo(new PushContent("Tu primera sugerencia",
                        "Gran Malbec, de los mejor valorados de Vinnot. Empezá por acá.", "/wines/" + WINE));
        assertThat(render(NotificationType.ONBOARDING, NotificationLocale.ES, Map.of("step", "3")).route()).isEqualTo("/wines");
        assertThat(render(NotificationType.WINBACK, NotificationLocale.ES, Map.of("attempt", "1", "wineId", WINE, "wine", "Gran Malbec")))
                .isEqualTo(new PushContent("Te extrañamos",
                        "Gran Malbec es de lo más buscado estas semanas.", "/wines/" + WINE));
        assertThat(render(NotificationType.WINBACK, NotificationLocale.EN, Map.of("attempt", "1")).body())
                .isEqualTo("New wines, routes and events are waiting for you.");
        assertThat(render(NotificationType.WINBACK, NotificationLocale.ES, Map.of("attempt", "2", "count", "37")))
                .isEqualTo(new PushContent("Novedades en Vinnot",
                        "Sumamos 37 vinos desde tu última visita.", "/wines"));
        assertThat(render(NotificationType.WINBACK, NotificationLocale.ES, Map.of("attempt", "2", "count", "0")).body())
                .isEqualTo("Hay rutas, bodegas y eventos nuevos para vos.");
        assertThat(render(NotificationType.MILESTONE, NotificationLocale.ES, Map.of("kind", "LIKES", "count", "50", "wineId", WINE)))
                .isEqualTo(new PushContent("Tu reseña sumó",
                        "Tus reseñas ya suman 50 me gusta.", "/wines/" + WINE));
        assertThat(render(NotificationType.MILESTONE, NotificationLocale.EN, Map.of("kind", "RATED", "count", "25")))
                .isEqualTo(new PushContent("A new milestone", "You have rated 25 wines. Each one sharpens your suggestions.", "/wines"));
    }

    @Test
    void everyCopyFitsTheLockScreenInBothLanguagesAndBothBundlesHaveTheSameKeys() throws IOException {
        Properties spanish = bundle("es");
        Properties english = bundle("en");
        assertThat(spanish.stringPropertyNames()).isEqualTo(english.stringPropertyNames());
        for (Properties copy : List.of(spanish, english)) {
            for (String key : copy.stringPropertyNames()) {
                String text = copy.getProperty(key).replaceAll("\\{[a-zA-Z]+}", "");
                // A lock screen shows the title and about two lines (80 characters) of the body: the fixed words leave
                // room for the names they carry, 25 characters in a title and 20 in a body.
                int limit = key.startsWith("type.") ? 40 : key.endsWith(".title") ? PushContent.MAX_TITLE - 25 : TWO_LINES - 20;
                assertThat(text.length()).as(key).isLessThanOrEqualTo(limit);
                assertThat(text).as(key).doesNotContainPattern("[\\p{So}!]{1}$");
            }
        }
    }

    @Test
    void withTypicalNamesEveryBodyFitsTwoLinesOnTheLockScreen() {
        Map<NotificationType, List<Map<String, String>>> samples = new HashMap<>();
        samples.put(NotificationType.TASTE_PICK, List.of(Map.of("wineId", WINE, "wine", "Gran Reserva Malbec 2021", "reasonKind", "TYPE",
                "reason", "FORTIFIED"), Map.of("wineId", WINE, "wine", "Gran Reserva Malbec 2021", "reasonKind", "GRAPE",
                "reason", "Cabernet Sauvignon")));
        samples.put(NotificationType.ROUTE_PICK, List.of(Map.of("routeId", "r1", "route", "Camino del Malbec", "region", "Luján de Cuyo")));
        samples.put(NotificationType.WINERY_PICK, List.of(Map.of("wineryId", "y1", "winery", "Bodega Catena Zapata", "region",
                "Luján de Cuyo")));
        samples.put(NotificationType.VIEWED_NOT_RATED, List.of(Map.of("wineId", WINE, "wine", "Gran Reserva Malbec 2021")));
        samples.put(NotificationType.CELLAR_CHECKIN, List.of(Map.of("wineId", WINE, "wine", "Gran Reserva Malbec 2021")));
        samples.put(NotificationType.WEEKEND_EVENTS, List.of(Map.of("count", "1", "event", "Cata de vinos de otoño", "eventId", "e1"),
                Map.of("count", "12", "event", "Cata de vinos de otoño")));
        samples.put(NotificationType.ONBOARDING, List.of(Map.of("step", "1"), Map.of("step", "2"),
                Map.of("step", "3", "wineId", WINE, "wine", "Gran Reserva Malbec 2021"), Map.of("step", "3")));
        samples.put(NotificationType.WINBACK, List.of(Map.of("attempt", "1", "wineId", WINE, "wine", "Gran Reserva Malbec 2021"),
                Map.of("attempt", "1"), Map.of("attempt", "2", "count", "1250"), Map.of("attempt", "2", "count", "0")));
        samples.put(NotificationType.MILESTONE, List.of(Map.of("kind", "LIKES", "count", "1000"), Map.of("kind", "RATED", "count", "250")));
        samples.put(NotificationType.POST_EVENT, List.of(Map.of("eventId", "e1", "event", "Cata de vinos de otoño")));
        for (var sample : samples.entrySet()) {
            for (Map<String, String> data : sample.getValue()) {
                for (NotificationLocale locale : NotificationLocale.values()) {
                    String body = render(sample.getKey(), locale, data).body();
                    assertThat(body.length()).as(sample.getKey() + " " + locale + ": " + body).isLessThanOrEqualTo(TWO_LINES);
                }
            }
        }
    }

    @Test
    void everyRouteIsOneTheAppOpensAndLongNamesAreShortenedNotCut() {
        String longName = "Gran Reserva Edición Limitada Familia ".repeat(6).strip();
        Map<NotificationType, Map<String, String>> samples = new HashMap<>();
        samples.put(NotificationType.TASTE_PICK, Map.of("wineId", WINE, "wine", longName, "reasonKind", "GRAPE", "reason", longName));
        samples.put(NotificationType.ROUTE_PICK, Map.of("routeId", WINE, "route", longName, "region", longName));
        samples.put(NotificationType.VIEWED_NOT_RATED, Map.of("wineId", WINE, "wine", longName));
        samples.put(NotificationType.CELLAR_CHECKIN, Map.of("wineId", WINE, "wine", longName));
        samples.put(NotificationType.WEEKEND_EVENTS, Map.of("count", "2", "event", longName));
        samples.put(NotificationType.WINERY_PICK, Map.of("wineryId", WINE, "winery", longName, "region", longName));
        samples.put(NotificationType.ONBOARDING, Map.of("step", "3", "wineId", WINE, "wine", longName));
        samples.put(NotificationType.WINBACK, Map.of("attempt", "1", "wineId", WINE, "wine", longName));
        samples.put(NotificationType.MILESTONE, Map.of("kind", "LIKES", "count", "1000"));
        samples.put(NotificationType.POST_EVENT, Map.of("eventId", WINE, "event", longName));
        for (var sample : samples.entrySet()) {
            for (NotificationLocale locale : NotificationLocale.values()) {
                PushContent content = render(sample.getKey(), locale, sample.getValue());
                assertThat(content.title().length()).as(sample.getKey() + " title").isLessThanOrEqualTo(PushContent.MAX_TITLE);
                assertThat(content.body().length()).as(sample.getKey() + " body").isLessThanOrEqualTo(PushContent.MAX_BODY);
                assertThat(content.route()).as(sample.getKey() + " route").matches(MOBILE_ROUTE);
            }
        }
    }

    private PushContent render(NotificationType type, NotificationLocale locale, Map<String, String> data) {
        return registry.render(type, locale, data);
    }

    private static Properties bundle(String language) throws IOException {
        Properties properties = new Properties();
        try (InputStream stream = EngagementPushTemplatesTest.class.getResourceAsStream("/push/engagement_" + language + ".properties")) {
            properties.load(new InputStreamReader(stream, StandardCharsets.UTF_8));
        }
        return properties;
    }
}
