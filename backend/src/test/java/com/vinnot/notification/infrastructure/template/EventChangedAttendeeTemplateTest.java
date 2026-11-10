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

class EventChangedAttendeeTemplateTest {
    private static final String SITE = "https://vinnot.example";
    private final EventChangedAttendeeTemplate template = new EventChangedAttendeeTemplate(GoldenEmails.brand(), SITE + "/");

    @Test
    void aNewDateShowsTheNewScheduleWithTheOneItReplacesInTheEventTimeZone() {
        var message = template.render(request(NotificationLocale.ES, Map.of("previousStartDate", "2026-10-20T12:00:00Z",
                "previousEndDate", "2026-10-20T14:00:00Z", "venue", "Bodega Norte, Mendoza")));

        assertThat(message.subject()).isEqualTo("Cambios en tu evento: Cata de otoño");
        assertThat(message.html()).contains("El organizador actualizó los detalles", "Fecha y horario", "21 oct 2026", "(antes: ",
                "20 oct 2026", "America/Argentina/Buenos Aires", "Lugar", "Bodega Norte, Mendoza", "Ver mi entrada",
                "href=\"" + SITE + "/my-tickets/reg-1\"");
        assertThat(message.text()).contains("Lugar: Bodega Norte, Mendoza\n").doesNotContain("(antes: Bodega");
    }

    @Test
    void aNewVenueInEnglishSaysWhereItWasAndEscapesIt() {
        var message = template.render(request(NotificationLocale.EN, Map.of("venueChanged", "true",
                "previousVenue", "Old <cellar>", "venue", "New hall")));

        assertThat(message.subject()).isEqualTo("Your event has been updated: Cata de otoño");
        assertThat(message.html()).contains("Venue", "New hall", "previously: Old &lt;cellar&gt;").doesNotContain("<cellar>");
        assertThat(message.text()).contains("Venue: New hall\n(previously: Old <cellar>)", "Date and time: ")
                .doesNotContain("previously: Oct");
    }

    @Test
    void aVenueClearedOrNotYetSetIsAnnouncedAsPending() {
        var message = template.render(request(NotificationLocale.ES, Map.of("venueChanged", "true", "previousVenue", "Bodega Norte")));

        assertThat(message.text()).contains("Lugar: A confirmar\n(antes: Bodega Norte)");
    }

    private static NotificationRequest request(NotificationLocale locale, Map<String, String> extra) {
        Map<String, String> data = new HashMap<>(Map.of("title", "Cata de otoño", "startDate", "2026-10-21T12:00:00Z",
                "endDate", "2026-10-21T14:00:00Z", "timeZone", "America/Argentina/Buenos_Aires", "registrationId", "reg-1"));
        data.putAll(extra);
        return NotificationRequest.of(NotificationType.EVENT_CHANGED_ATTENDEE, NotificationRecipient.address("ana@example.test", null),
                locale, data, "test");
    }
}
