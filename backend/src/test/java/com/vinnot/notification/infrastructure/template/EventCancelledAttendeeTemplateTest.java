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

class EventCancelledAttendeeTemplateTest {
    private static final String SITE = "https://vinnot.example";
    private final EventCancelledAttendeeTemplate template = new EventCancelledAttendeeTemplate(GoldenEmails.brand(), SITE + "/");

    @Test
    void explainsTheReasonTheLocalDateAndTheAutomaticRefund() {
        var message = template.render(request(NotificationLocale.ES, Map.of("reason", "WEATHER", "refund", "ONLINE")));

        assertThat(message.subject()).isEqualTo("Evento cancelado: Cata de otoño");
        assertThat(message.html()).contains("Lamentamos informarte que el evento", "Motivo", "Condiciones climáticas",
                "Fecha prevista", "9:00", "America/Argentina/Buenos Aires",
                "solicitamos la devolución automática al mismo medio de pago",
                "href=\"" + SITE + "/events\"")
                .doesNotContain("el organizador gestionará la devolución");
        assertThat(message.text()).contains("Motivo: Condiciones climáticas", "Gracias por tu comprensión.");
    }

    @Test
    void tellsEnglishOnlinePayersTheRefundWasRequestedAutomatically() {
        var message = template.render(request(NotificationLocale.EN, Map.of("reason", "WEATHER", "refund", "ONLINE")));

        assertThat(message.html()).contains("we have requested an automatic refund to the same payment method").doesNotContain("the organizer will arrange your refund");
        assertThat(message.text()).contains("Timing depends on Mercado Pago and your bank.");
    }

    @Test
    void showsTheOrganizerNoteForOtherAndTheOrganizerRefundInEnglish() {
        var message = template.render(request(NotificationLocale.EN,
                Map.of("reason", "OTHER", "note", "The <sommelier> is ill", "refund", "ORGANIZER")));

        assertThat(message.subject()).isEqualTo("Event cancelled: Cata de otoño");
        assertThat(message.html()).contains("Other reason", "The &lt;sommelier&gt; is ill",
                "they will contact you to arrange your refund").doesNotContain("<sommelier>");
        assertThat(message.text()).contains("Reason: Other reason\nThe <sommelier> is ill");
    }

    @Test
    void freeRegistrationsAreToldThereIsNothingToDo() {
        var message = template.render(request(NotificationLocale.ES, Map.of("reason", "UNFORESEEN_CIRCUMSTANCES", "refund", "NONE")));

        assertThat(message.html()).contains("Circunstancias imprevistas", "No tienes que hacer nada más.");
    }

    private static NotificationRequest request(NotificationLocale locale, Map<String, String> extra) {
        Map<String, String> data = new HashMap<>(Map.of("title", "Cata de otoño", "startDate", "2026-10-20T12:00:00Z",
                "timeZone", "America/Argentina/Buenos_Aires"));
        data.putAll(extra);
        return NotificationRequest.of(NotificationType.EVENT_CANCELLED_ATTENDEE, NotificationRecipient.address("ana@example.test", null),
                locale, data, "test");
    }
}
