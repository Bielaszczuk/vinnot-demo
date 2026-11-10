package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AnnouncementTestTemplateTest {
    private final AnnouncementTestTemplate template = new AnnouncementTestTemplate(GoldenEmails.brand(),
            new NewsletterTemplate(GoldenEmails.brand()), new ServiceNoticeTemplate(GoldenEmails.brand()));

    @Test
    void aNewsTestLooksLikeTheNewsWithItsUnsubscribeFooterAndAMarkedSubject() {
        var message = template.render(request(NotificationLocale.ES, Map.of(NotificationType.KIND, "NEWS",
                NotificationType.SUBJECT, "Vendimia", NotificationType.BODY, "Catas **todo el mes**.",
                NotificationType.UNSUBSCRIBE_URL, "https://vinnot.test/unsubscribe")));

        assertThat(message.subject()).isEqualTo("[Prueba] Vendimia");
        assertThat(message.html()).contains("Hola Ana,", "todo el mes</strong>", "https://vinnot.test/unsubscribe");
        assertThat(template.type().category().transactional()).isTrue();
    }

    @Test
    void aServiceTestUsesTheTransactionalLayout() {
        var message = template.render(request(NotificationLocale.EN, Map.of(NotificationType.KIND, "SERVICE",
                NotificationType.SUBJECT, "Maintenance", NotificationType.BODY, "Sunday from 2 to 4.")));

        assertThat(message.subject()).isEqualTo("[Test] Maintenance");
        assertThat(message.html()).contains("Hi Ana,", "Sunday from 2 to 4.").doesNotContain("Unsubscribe");
    }

    private static NotificationRequest request(NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(NotificationType.ANNOUNCEMENT_TEST, NotificationRecipient.address("ana@example.test", "Ana"),
                locale, data, "announcement-test:1");
    }
}
