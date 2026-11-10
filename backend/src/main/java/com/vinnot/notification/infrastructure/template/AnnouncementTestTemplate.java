package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * An administrator's test of an announcement (#310): rendered by the template of the kind being tested, so it looks
 * exactly like the real one, with the subject marked as a test.
 */
@Component
public class AnnouncementTestTemplate extends BundleEmailTemplate {
    static final String BUNDLE = "announcement_test";
    private final NewsletterTemplate news;
    private final ServiceNoticeTemplate service;

    public AnnouncementTestTemplate(BrandedEmailTemplate brand, NewsletterTemplate news, ServiceNoticeTemplate service) {
        super(NotificationType.ANNOUNCEMENT_TEST, BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.news = news;
        this.service = service;
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        AnnouncementKind kind = AnnouncementKind.valueOf(required(request, NotificationType.KIND));
        Map<String, String> data = new HashMap<>(request.data());
        data.put(NotificationType.SUBJECT, copy.text("subject",
                Map.of("subject", required(request, NotificationType.SUBJECT))));
        NotificationRequest tested = NotificationRequest.of(kind.type(), request.recipient(), request.locale(), data,
                request.dedupeKey());
        return kind == AnnouncementKind.NEWS ? news.render(tested) : service.render(tested);
    }
}
