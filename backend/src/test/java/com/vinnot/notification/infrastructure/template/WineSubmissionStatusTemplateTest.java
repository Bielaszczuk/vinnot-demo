package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WineSubmissionStatusTemplateTest {
    private static final Map<String, String> SPANISH_STATUSES = Map.of("PENDING", "Procesando", "APPROVED", "Publicado",
            "DUPLICATE", "Duplicado", "REJECTED", "Rechazado", "NEEDS_REVIEW", "Necesita revisión",
            "CHANGES_REQUESTED", "Correcciones solicitadas");
    private static final Map<String, String> ENGLISH_STATUSES = Map.of("PENDING", "Processing", "APPROVED", "Published",
            "DUPLICATE", "Duplicate", "REJECTED", "Rejected", "NEEDS_REVIEW", "Needs review",
            "CHANGES_REQUESTED", "Changes requested");

    private final WineSubmissionStatusTemplate template = new WineSubmissionStatusTemplate(GoldenEmails.brand());

    @Test
    void keepsThePreviousLayoutAndAdministratorTextWithAReadableStatus() {
        GoldenEmails.assertSame("wine-submission-status", "ana@example.test",
                template.render(request("Ana", NotificationLocale.ES, Map.of("wineName", "Reserva <Malbec>",
                        "status", "REJECTED", "reason", "Falta la etiqueta {{title}}"))));
        // The submission adapter sends an empty reason when there is none, exactly as before.
        GoldenEmails.assertSame("wine-submission-status-empty-reason", "ana@example.test",
                template.render(request("Ana", NotificationLocale.ES, Map.of("wineName", "Malbec", "status", "APPROVED",
                        "reason", ""))));
    }

    @Test
    void rendersEveryStatusAsReadableCopyInSpanishAndEnglish() {
        SPANISH_STATUSES.forEach((status, label) -> assertThat(text(NotificationLocale.ES, status))
                .contains("Tu propuesta Malbec ahora tiene el estado «" + label + "».").doesNotContain(status));
        ENGLISH_STATUSES.forEach((status, label) -> assertThat(text(NotificationLocale.EN, status))
                .contains("The status of your proposal Malbec is now \"" + label + "\".").doesNotContain(status));
    }

    @Test
    void anUnknownStatusFallsBackToANeutralPhraseInsteadOfTheRawValue() {
        assertThat(text(NotificationLocale.ES, "ARCHIVED")).contains("«Actualizado»").doesNotContain("ARCHIVED");
        assertThat(text(NotificationLocale.EN, "ARCHIVED")).contains("\"Updated\"").doesNotContain("ARCHIVED");
    }

    @Test
    void systemReasonCodesRenderAsLocalizedCopy() {
        var spanish = template.render(request("Ana", NotificationLocale.ES, Map.of("wineName", "Malbec",
                "status", "NEEDS_REVIEW", "reason", "", "reasonCode", "RECOGNITION_UNAVAILABLE")));
        assertThat(spanish.text()).contains("«Necesita revisión». El reconocimiento de etiquetas no estaba disponible.");
        assertThat(spanish.html()).contains("<strong style=\"color:#382b33;\">Observaciones</strong><br>"
                + "El reconocimiento de etiquetas no estaba disponible.</p>");
        var english = template.render(request("Ana", NotificationLocale.EN, Map.of("wineName", "Malbec",
                "status", "APPROVED", "reason", "", "reasonCode", "AUTO_APPROVED")));
        assertThat(english.text()).contains("\"Published\". It passed the automatic validation.");
        assertThat(english.html()).contains("<strong style=\"color:#382b33;\">Notes</strong><br>It passed the automatic validation.");
        for (String code : new String[] {"AUTO_APPROVED", "CATALOG_MATCH", "CHECKS_PASSED", "NOT_A_WINE_LABEL",
                "RECOGNITION_UNAVAILABLE", "MODERATION_UNAVAILABLE", "VALIDATION_UNAVAILABLE", "LOW_CONFIDENCE",
                "CONTENT_REVIEW"}) {
            for (NotificationLocale locale : NotificationLocale.values()) {
                assertThat(template.render(request("Ana", locale, Map.of("wineName", "Malbec", "status", "NEEDS_REVIEW",
                        "reason", "", "reasonCode", code))).text()).doesNotContain(code);
            }
        }
    }

    @Test
    void anUnknownReasonCodeFallsBackToNoObservations() {
        var rendered = template.render(request("Ana", NotificationLocale.ES, Map.of("wineName", "Malbec",
                "status", "NEEDS_REVIEW", "reason", "", "reasonCode", "SOMETHING_NEW")));
        assertThat(rendered.text()).contains("Sin observaciones adicionales").doesNotContain("SOMETHING_NEW");
    }

    @Test
    void rendersTheEnglishCopyInTheEnglishLayout() {
        GoldenEmails.assertSame("wine-submission-status-en", "ana@example.test",
                template.render(request("Ana", NotificationLocale.EN, Map.of("wineName", "Reserva <Malbec>",
                        "status", "CHANGES_REQUESTED", "reason", "Add the back label {{title}}"))));
        assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
    }

    @Test
    void escapesUntrustedContentAndKeepsTheBlankNameAndMissingReasonFallbacks() {
        var hostile = template.render(request(" ", NotificationLocale.ES, Map.of("wineName", "<script>wine</script> {status}",
                "status", "REJECTED", "reason", "<img src=x> {{title}}")));
        assertThat(hostile.html()).contains("&lt;script&gt;wine&lt;/script&gt; {status}", "&lt;img src=x&gt; {{title}}")
                .doesNotContain("<script>", "<img src=x>");
        var fallback = template.render(request(null, NotificationLocale.ES, Map.of("wineName", "Malbec", "status", "APPROVED")));
        assertThat(fallback.html()).contains("Hola,", "Sin observaciones adicionales");
        assertThat(fallback.text()).startsWith(
                "Hola,\n\nTu propuesta Malbec ahora tiene el estado «Publicado». Sin observaciones adicionales");
        var english = template.render(request(null, NotificationLocale.EN, Map.of("wineName", "Malbec", "status", "APPROVED")));
        assertThat(english.text()).startsWith("Hello,\n\nThe status of your proposal Malbec is now \"Published\". No additional notes");
    }

    private String text(NotificationLocale locale, String status) {
        return template.render(request("Ana", locale, Map.of("wineName", "Malbec", "status", status, "reason", ""))).text();
    }

    private static NotificationRequest request(String name, NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(NotificationType.WINE_SUBMISSION_STATUS, NotificationRecipient.address("ana@example.test", name),
                locale, data, "submission:1");
    }
}
