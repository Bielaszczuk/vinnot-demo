package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.AnnouncementBody;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

/**
 * Pushes of administrators' announcements (#310): the title, the body's paragraphs as plain text, and the in-app path
 * chosen when the announcement was sent ({@code /} opens the app). The author's words are the copy; only the test
 * marks its title, from the {@code announcement_test} bundle.
 */
@Configuration
public class AnnouncementPushTemplates {
    @Bean
    PushTemplate newsletterPushTemplate() {
        return new AnnouncementPushTemplate(NotificationType.NEWSLETTER);
    }

    @Bean
    PushTemplate serviceNoticePushTemplate() {
        return new AnnouncementPushTemplate(NotificationType.SERVICE_NOTICE);
    }

    @Bean
    PushTemplate announcementTestPushTemplate() {
        Map<NotificationLocale, PushCopy> copies = new EnumMap<>(NotificationLocale.class);
        for (NotificationLocale locale : NotificationLocale.values()) {
            copies.put(locale, PushCopy.load("announcement_test", locale));
        }
        return new AnnouncementTestPushTemplate(Map.copyOf(copies));
    }

    static PushContent content(String title, Map<String, String> data) {
        AnnouncementBody body = AnnouncementBody.parse(data.get(NotificationType.BODY));
        String summary = body.summary().isBlank() ? body.plainText() : body.summary();
        return new PushContent(title, summary, Objects.requireNonNullElse(data.get(NotificationType.ROUTE), "/"));
    }

    record AnnouncementPushTemplate(NotificationType type) implements PushTemplate {
        @Override
        public PushContent render(NotificationLocale locale, Map<String, String> data) {
            return content(Objects.requireNonNull(data.get(NotificationType.SUBJECT), "subject"), data);
        }
    }

    record AnnouncementTestPushTemplate(Map<NotificationLocale, PushCopy> copies) implements PushTemplate {
        @Override
        public NotificationType type() {
            return NotificationType.ANNOUNCEMENT_TEST;
        }

        @Override
        public PushContent render(NotificationLocale locale, Map<String, String> data) {
            String subject = Objects.requireNonNull(data.get(NotificationType.SUBJECT), "subject");
            return content(copies.get(locale).text("title", Map.of("subject", subject)), data);
        }
    }
}
