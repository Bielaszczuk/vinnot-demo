package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.AnnouncementBody;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * A service notice (#310): written by an administrator in the {@link AnnouncementBody} format and sent to every
 * active account in the transactional layout, without an unsubscribe link.
 */
@Component
public class ServiceNoticeTemplate extends BundleEmailTemplate {
    static final String BUNDLE = "service_notice";

    public ServiceNoticeTemplate(BrandedEmailTemplate brand) {
        super(NotificationType.SERVICE_NOTICE, BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String subject = required(request, NotificationType.SUBJECT);
        AnnouncementBody content = AnnouncementBody.parse(required(request, NotificationType.BODY));
        String greeting = greeting(copy, request.recipient().displayName());
        String html = BrandedEmailTemplate.paragraph(greeting) + AnnouncementEmailContent.html(content, language);
        return new RenderedNotification(subject, brand().text(language, greeting + "\n\n" + content.plainText()),
                brand().html(language, subject, content.summary(), html));
    }
}
