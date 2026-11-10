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

class EventReminderTemplateTest {
    private static final String SITE = "https://vinnot.example";
    private final EventReminderTemplate template = new EventReminderTemplate(GoldenEmails.brand(), SITE + "/");

    @Test
    void showsTheLocalDateTheVenueAndTheTicketLink() {
        var message = template.render(request(NotificationLocale.ES, Map.of("venue", "Bodega <Norte>, Mendoza")));

        assertThat(message.subject()).isEqualTo("Recordatorio: Cata de otoño se acerca");
        assertThat(message.html()).contains("Te recordamos que", "Fecha y horario", "21 oct 2026", "9:00",
                "America/Argentina/Buenos Aires", "Bodega &lt;Norte&gt;, Mendoza", "Ver mi entrada",
                "href=\"" + SITE + "/my-tickets/reg-1\"").doesNotContain("<Norte>");
        assertThat(message.text()).contains("Lugar: Bodega <Norte>, Mendoza", "Ver mi entrada: " + SITE + "/my-tickets/reg-1");
    }

    @Test
    void anEventWithoutVenueSaysItIsToBeAnnouncedInEnglish() {
        var message = template.render(request(NotificationLocale.EN, Map.of()));

        assertThat(message.subject()).isEqualTo("Reminder: Cata de otoño is coming up");
        assertThat(message.text()).contains("Venue: To be announced", "Date and time: ", "View my ticket");
    }

    private static NotificationRequest request(NotificationLocale locale, Map<String, String> extra) {
        Map<String, String> data = new HashMap<>(Map.of("title", "Cata de otoño", "startDate", "2026-10-21T12:00:00Z",
                "timeZone", "America/Argentina/Buenos_Aires", "registrationId", "reg-1"));
        data.putAll(extra);
        return NotificationRequest.of(NotificationType.EVENT_REMINDER, NotificationRecipient.address("ana@example.test", null),
                locale, data, "test");
    }
}
