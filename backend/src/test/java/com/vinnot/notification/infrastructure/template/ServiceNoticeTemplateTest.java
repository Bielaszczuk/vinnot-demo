package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceNoticeTemplateTest {
    private final ServiceNoticeTemplate template = new ServiceNoticeTemplate(GoldenEmails.brand());

    @Test
    void aServiceNoticeUsesTheTransactionalLayoutWithoutAnUnsubscribeLink() {
        var message = template.render(NotificationRequest.of(NotificationType.SERVICE_NOTICE,
                NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.EN,
                Map.of(NotificationType.SUBJECT, "Scheduled maintenance",
                        NotificationType.BODY, "## Sunday night\nThe app may be **unavailable** from 2 to 4."), "service:1"));

        assertThat(message.subject()).isEqualTo("Scheduled maintenance");
        assertThat(message.html()).contains("Hi Ana,", ">Sunday night</h2>", "unavailable</strong>",
                "This email relates to your account or activity on Vinnot.").doesNotContain("Unsubscribe");
        assertThat(message.text()).contains("Sunday night", "The app may be unavailable from 2 to 4.")
                .doesNotContain("Unsubscribe");
        assertThat(template.type().category().transactional()).isTrue();
    }
}
