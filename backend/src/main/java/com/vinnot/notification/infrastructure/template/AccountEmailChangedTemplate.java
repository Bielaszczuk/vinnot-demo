package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Map;
import java.util.Set;

/** Security notice sent to the previous address after an email change. */
public class AccountEmailChangedTemplate extends BundleEmailTemplate {
    public AccountEmailChangedTemplate(BrandedEmailTemplate brand) {
        super(NotificationType.ACCOUNT_EMAIL_CHANGED, AccountEmailTemplates.BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String subject = copy.text("emailChanged.subject");
        String greeting = greeting(copy, request.recipient().displayName());
        Map<String, String> values = Map.of("email", required(request, "newEmail"));
        String text = greeting + "\n\n" + copy.text("emailChanged.text", values);
        String html = BrandedEmailTemplate.paragraph(greeting)
                + BrandedEmailTemplate.paragraph(copy.text("emailChanged.html", values))
                + BrandedEmailTemplate.paragraph(copy.text("emailChanged.support"));
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, subject, html));
    }
}
