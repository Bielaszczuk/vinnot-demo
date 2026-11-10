package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SupportRequestTemplateTest {
    private final SupportRequestTemplate template = new SupportRequestTemplate(GoldenEmails.brand());

    @Test
    void reproducesThePreviousSupportEmailAndRepliesToTheRequester() {
        var rendered = template.render(NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address("support@vinnot.example", null), NotificationLocale.EN,
                Map.of("requestId", "f0da7948-e767-458d-9681-43a38ed9d6c9", "name", "Name", "email", "reply@example.org",
                        "subject", "privacy", "message", "<script>Text</script>\nBcc: attacker@example.org"),
                "support:f0da7948-e767-458d-9681-43a38ed9d6c9"));
        GoldenEmails.assertSame("support-request", "support@vinnot.example", rendered);
        assertThat(rendered.replyTo()).isEqualTo("reply@example.org");
        assertThat(template.locales()).containsExactly(NotificationLocale.EN);
    }

    @Test
    void formatsOnlyCanonicalUuidsAsDisplayReferencesAndRequiresEveryField() {
        assertThat(SupportRequestTemplate.displayReference("f0da7948-e767-458d-9681-43a38ed9d6c9")).isEqualTo("VIN-43A38ED9D6C9");
        assertThat(SupportRequestTemplate.displayReference("legacy-id")).isEqualTo("legacy-id");
        assertThatThrownBy(() -> template.render(NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address("support@vinnot.example", null), NotificationLocale.EN, Map.of("requestId", "id"), "k")))
                .hasMessageContaining("missing subject");
    }
}
