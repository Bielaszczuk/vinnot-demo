package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Map;
import java.util.Set;

/** An account email whose only job is a single-use link: verification, password reset or email change. */
public class AccountLinkEmailTemplate extends BundleEmailTemplate {
    private final String copyPrefix;

    public AccountLinkEmailTemplate(NotificationType type, String copyPrefix, BrandedEmailTemplate brand) {
        super(type, AccountEmailTemplates.BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.copyPrefix = copyPrefix;
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String subject = copy.text(copyPrefix + ".subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String url = required(request, NotificationType.ACTION_URL);
        String text = greeting + "\n\n" + copy.text(copyPrefix + ".text", Map.of("url", url));
        String html = BrandedEmailTemplate.paragraph(greeting)
                + BrandedEmailTemplate.paragraph(copy.text(copyPrefix + ".html"))
                + BrandedEmailTemplate.action(url, copy.text(copyPrefix + ".action"), language)
                + BrandedEmailTemplate.paragraph(copy.text("ignore"));
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, subject, html));
    }
}
