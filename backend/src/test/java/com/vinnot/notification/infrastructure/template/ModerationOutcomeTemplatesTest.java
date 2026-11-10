package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ModerationOutcomeTemplatesTest {
    private final ModerationEmailTemplates templates = new ModerationEmailTemplates();
    private final NotificationTemplate removed = templates.contentRemovedTemplate(GoldenEmails.brand(), GoldenEmails.SITE);
    private final NotificationTemplate report = templates.reportOutcomeTemplate(GoldenEmails.brand(), GoldenEmails.SITE);

    @Test
    void theAuthorLearnsTheRemovalAndTheReportReasonWithoutTheReporter() {
        var reported = removed.render(request(NotificationType.CONTENT_REMOVED, NotificationLocale.ES,
                Map.of("kind", "COMMENT", "wineName", "Gran Malbec", "reportReason", "HARASSMENT")));
        assertThat(reported.subject()).isEqualTo("Retiramos tu comentario");
        assertThat(reported.text()).contains("Tu comentario sobre Gran Malbec fue reportado.", "Motivo: Acoso o intimidación.",
                "Ver las normas de la comunidad: " + GoldenEmails.SITE + "/content-policy");

        var direct = removed.render(request(NotificationType.CONTENT_REMOVED, NotificationLocale.EN,
                Map.of("kind", "REVIEW", "wineName", "Gran Malbec")));
        assertThat(direct.subject()).isEqualTo("We removed your review");
        assertThat(direct.text()).contains("We reviewed your review of Gran Malbec and removed it").doesNotContain("Reason:", "reported");

        var legacy = removed.render(request(NotificationType.CONTENT_REMOVED, NotificationLocale.EN,
                Map.of("kind", "REVIEW", "wineName", "Gran Malbec", "reportReason", "UNKNOWN")));
        assertThat(legacy.text()).contains("Reason: A breach of the community guidelines.");
        assertThat(removed.type()).isEqualTo(NotificationType.CONTENT_REMOVED);
    }

    @Test
    void theReporterLearnsTheOutcomeOfTheirReport() {
        var dismissed = report.render(request(NotificationType.REPORT_OUTCOME, NotificationLocale.ES,
                Map.of("outcome", "DISMISSED", "targetType", "REVIEW", "reason", "SPAM")));
        assertThat(dismissed.subject()).isEqualTo("Revisamos tu reporte");
        assertThat(dismissed.text()).contains("no encontramos que incumpla las normas de la comunidad",
                "Contenido reportado: Una reseña", "Motivo del reporte: Spam o contenido promocional.",
                "Gracias por ayudarnos a cuidar la comunidad de Vinnot.");

        var removedOutcome = report.render(request(NotificationType.REPORT_OUTCOME, NotificationLocale.EN,
                Map.of("outcome", "REMOVED", "targetType", "WINE_ROUTE", "reason", "PRIVACY")));
        assertThat(removedOutcome.text()).contains("removed it because it does not meet the community guidelines",
                "Reported content: A wine route", "Report reason: Personal data or privacy.");

        var unknown = report.render(request(NotificationType.REPORT_OUTCOME, NotificationLocale.EN,
                Map.of("outcome", "ESCALATED", "targetType", "POST", "reason", "OTHER")));
        assertThat(unknown.text()).contains("took the action the community guidelines call for", "Reported content: Community content");
        assertThat(report.type()).isEqualTo(NotificationType.REPORT_OUTCOME);
    }

    private static NotificationRequest request(NotificationType type, NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(type, NotificationRecipient.user(UUID.randomUUID()), locale, data, "moderation:1");
    }
}
