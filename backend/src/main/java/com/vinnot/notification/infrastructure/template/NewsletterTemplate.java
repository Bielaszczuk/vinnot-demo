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
 * Promotional news (#310). An administrator writes the subject and the body in the {@link AnnouncementBody} format;
 * the layout adds the promotional footer with the unsubscribe link.
 */
@Component
public class NewsletterTemplate extends BundleEmailTemplate {
    static final String BUNDLE = "newsletter";

    public NewsletterTemplate(BrandedEmailTemplate brand) {
        super(NotificationType.NEWSLETTER, BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String subject = required(request, NotificationType.SUBJECT);
        String body = required(request, NotificationType.BODY);
        String unsubscribeUrl = required(request, NotificationType.UNSUBSCRIBE_URL);
        AnnouncementBody content = AnnouncementBody.parse(body);
        String greeting = greeting(copy, request.recipient().displayName());
        String html = BrandedEmailTemplate.paragraph(greeting) + AnnouncementEmailContent.html(content, language);
        return new RenderedNotification(subject,
                brand().promotionalText(language, greeting + "\n\n" + content.plainText(), unsubscribeUrl),
                brand().promotionalHtml(language, subject, content.summary(), html, unsubscribeUrl));
    }
}
