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

class ModerationQueueDigestTemplateTest {
    private final NotificationTemplate template = new ModerationEmailTemplates()
            .moderationQueueDigestTemplate(GoldenEmails.brand(), GoldenEmails.SITE);

    @Test
    void aSingleItemIsNamedAndLinksToItsQueue() {
        var submission = template.render(request(NotificationLocale.ES, Map.of("submissions", "1", "reports", "0", "wineName", "Gran Malbec")));
        assertThat(submission.subject()).isEqualTo("Nueva propuesta de vino para revisar");
        assertThat(submission.text()).contains("La propuesta de Gran Malbec espera tu revisión.",
                "Revisar propuestas: " + GoldenEmails.SITE + "/admin/wine-submissions").doesNotContain("reportes");

        var report = template.render(request(NotificationLocale.EN, Map.of("submissions", "0", "reports", "1", "reportReason", "HATE")));
        assertThat(report.subject()).isEqualTo("New community report");
        assertThat(report.text()).contains("Community content was reported for this reason: hate speech.",
                "Review reports: " + GoldenEmails.SITE + "/admin/community");
    }

    @Test
    void severalItemsAreCountedPerQueue() {
        var digest = template.render(request(NotificationLocale.ES, Map.of("submissions", "3", "reports", "2")));
        assertThat(digest.subject()).isEqualTo("Novedades en la cola de moderación");
        assertThat(digest.text()).contains("Hay 3 propuestas de vino nuevas esperando revisión.",
                "Hay 2 reportes nuevos de la comunidad para revisar.");
        var oneOfEach = template.render(request(NotificationLocale.EN, Map.of("submissions", "1", "reports", "1")));
        assertThat(oneOfEach.subject()).isEqualTo("New work in the moderation queue");
        assertThat(oneOfEach.text()).contains("A new wine submission is waiting for review.",
                "A new community report is waiting for review.");
        assertThat(template.type()).isEqualTo(NotificationType.MODERATION_QUEUE_DIGEST);
    }

    private static NotificationRequest request(NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(NotificationType.MODERATION_QUEUE_DIGEST, NotificationRecipient.user(UUID.randomUUID()),
                locale, data, "moderation-digest:1");
    }
}
