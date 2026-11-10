package com.vinnot.notification.infrastructure.template;

import com.vinnot.event.domain.valueobject.EventPaymentStatus;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

class EventRegistrationTemplatesTest {
    private static final String REGISTRATION = "11111111-2222-3333-4444-555555555555";
    private static final String START = "2026-10-20T12:00:00Z";
    private static final String EXPIRES = "2026-10-19T18:45:00Z";
    private final EventRegistrationTemplates configuration = new EventRegistrationTemplates();
    private final NotificationTemplate attendee = configuration.eventRegistrationAttendeeTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");
    private final NotificationTemplate organizer = configuration.eventRegistrationOrganizerTemplate(GoldenEmails.brand(), GoldenEmails.SITE);

    @Test
    void rendersTheAttendeeEmailsInBothLanguages() {
        GoldenEmails.assertSame("event-registration-attendee-es", "guest@example.test", attendee.render(request(
                NotificationType.EVENT_REGISTRATION_ATTENDEE, "guest@example.test", NotificationLocale.ES,
                data("<Cata> & maridaje", "CONFIRMED", "APPROVED", "2", null, "Guest", "+541100000000"))));
        GoldenEmails.assertSame("event-registration-attendee-en", "guest@example.test", attendee.render(request(
                NotificationType.EVENT_REGISTRATION_ATTENDEE, "guest@example.test", NotificationLocale.EN,
                data("Tasting", "AWAITING_PAYMENT", "PENDING", "1", EXPIRES, "Guest", null))));
    }

    @Test
    void rendersTheOrganizerEmailsInBothLanguages() {
        GoldenEmails.assertSame("event-registration-organizer-es", "owner@example.test", organizer.render(request(
                NotificationType.EVENT_REGISTRATION_ORGANIZER, "owner@example.test", NotificationLocale.ES,
                data("Cata", "REQUESTED", "NOT_REQUIRED", "3", null, "Guest <b>", null))));
        GoldenEmails.assertSame("event-registration-organizer-en", "owner@example.test", organizer.render(request(
                NotificationType.EVENT_REGISTRATION_ORGANIZER, "owner@example.test", NotificationLocale.EN,
                data("Tasting", "AWAITING_PAYMENT", "PENDING", "4", EXPIRES, "Guest", "+541100000000"))));
    }

    @Test
    void showsDatesInTheEventTimeZoneForEveryRecipient() {
        var data = data("Tasting", "AWAITING_PAYMENT", "PENDING", "1", EXPIRES, "Guest", null);
        var spanish = attendee.render(request(NotificationType.EVENT_REGISTRATION_ATTENDEE, "guest@example.test",
                NotificationLocale.ES, data));
        var english = organizer.render(request(NotificationType.EVENT_REGISTRATION_ORGANIZER, "owner@example.test",
                NotificationLocale.EN, data));
        assertThat(spanish.text()).contains("Fecha del evento: 20 oct 2026, 9:00:00 (America/Argentina/Buenos Aires)\n",
                "Confirmá antes de: 19 oct 2026, 15:45:00 (America/Argentina/Buenos Aires)\n").doesNotContain("UTC");
        assertThat(english.text()).contains("Event date: Oct 20, 2026, 9:00:00\u202FAM (America/Argentina/Buenos Aires)\n")
                .doesNotContain("UTC");
    }

    @Test
    void messagesQueuedWithoutAnEventTimeZoneSayTheyAreInUtc() {
        var queuedBeforeTheUpgrade = data("Cata", "CONFIRMED", "APPROVED", "2", null, null, null);
        queuedBeforeTheUpgrade.remove("timeZone");
        var rendered = attendee.render(request(NotificationType.EVENT_REGISTRATION_ATTENDEE, "guest@example.test",
                NotificationLocale.ES, queuedBeforeTheUpgrade));
        assertThat(rendered.text()).contains("Fecha del evento: 20 oct 2026, 12:00:00 (UTC)\n");
        var invalid = data("Cata", "CONFIRMED", "APPROVED", "2", null, null, null);
        invalid.put("timeZone", "Mars/Olympus");
        assertThat(attendee.render(request(NotificationType.EVENT_REGISTRATION_ATTENDEE, "guest@example.test",
                NotificationLocale.ES, invalid)).text()).contains("Fecha del evento: 20 oct 2026, 12:00:00 (UTC)\n");
    }

    @Test
    void translatesEveryStateEscapesUserContentAndNeverShowsAttendeesTheContact() {
        for (NotificationLocale locale : NotificationLocale.values()) {
            for (var status : EventRegistrationStatus.values()) {
                for (var payment : EventPaymentStatus.values()) {
                    var rendered = attendee.render(request(NotificationType.EVENT_REGISTRATION_ATTENDEE, "guest@example.test",
                            locale, data("<script>unsafe</script>", status.name(), payment.name(), "2", null, "Fixture", "+541100000000")));
                    assertThat(rendered.html()).contains("&lt;script&gt;", "/my-tickets/" + REGISTRATION)
                            .doesNotContain("<script>", "+541100000000");
                    assertThat(rendered.html()).contains(locale == NotificationLocale.EN ? "View my ticket" : "Ver mi entrada");
                }
            }
        }
        var missingContact = organizer.render(request(NotificationType.EVENT_REGISTRATION_ORGANIZER, "owner@example.test",
                NotificationLocale.EN, data("Tasting", "CONFIRMED", "APPROVED", "1", null, null, null)));
        assertThat(missingContact.text()).contains("Reservation contact: null\n");
        assertThat(attendee.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
        assertThat(organizer.type()).isEqualTo(NotificationType.EVENT_REGISTRATION_ORGANIZER);
    }

    private static NotificationRequest request(NotificationType type, String recipient, NotificationLocale locale,
            Map<String, String> data) {
        return NotificationRequest.of(type, NotificationRecipient.address(recipient, null), locale, data, "event:1");
    }

    private static Map<String, String> data(String title, String status, String payment, String attendees, String expires,
            String contactName, String contactPhone) {
        Map<String, String> data = new HashMap<>(Map.of("registrationId", REGISTRATION, "title", title, "status", status,
                "paymentStatus", payment, "attendees", attendees, "startDate", START,
                "timeZone", "America/Argentina/Buenos_Aires"));
        if (Objects.nonNull(expires)) {
            data.put("expiresAt", expires);
        }
        if (Objects.nonNull(contactName)) {
            data.put("contactName", contactName);
        }
        if (Objects.nonNull(contactPhone)) {
            data.put("contactPhone", contactPhone);
        }
        return data;
    }
}
