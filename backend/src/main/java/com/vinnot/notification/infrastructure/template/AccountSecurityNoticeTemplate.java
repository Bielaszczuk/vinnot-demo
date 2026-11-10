package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * A short notice about a change to the account, with what to do if the reader did not make it. While the
 * account exists that is resetting the password; after a deletion only support can help.
 */
public class AccountSecurityNoticeTemplate extends BundleEmailTemplate {
    private final String key;
    private final String website;

    public AccountSecurityNoticeTemplate(NotificationType type, String key, BrandedEmailTemplate brand, String website) {
        super(type, AccountEmailTemplates.BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.key = key;
        this.website = website.endsWith("/") ? website.substring(0, website.length() - 1) : website;
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        final String subject = copy.text(key + ".subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String body = copy.text(key + ".body", values(request));
        StringBuilder text = new StringBuilder(greeting).append("\n\n").append(body).append("\n\n");
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(greeting)).append(BrandedEmailTemplate.paragraph(body));
        if (type() == NotificationType.ACCOUNT_DELETED) {
            text.append(copy.text("security.support"));
            html.append(BrandedEmailTemplate.paragraph(copy.text("security.support")));
        } else {
            String reset = website + "/forgot-password";
            text.append(copy.text("security.notYou")).append(' ').append(reset);
            html.append(BrandedEmailTemplate.paragraph(copy.text("security.notYou")))
                    .append(BrandedEmailTemplate.action(reset, copy.text("security.resetAction"), language));
        }
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, subject, html.toString()));
    }

    private Map<String, String> values(NotificationRequest request) {
        if (type() != NotificationType.ACCOUNT_SOCIAL_LINKED) {
            return Map.of();
        }
        String provider = required(request, NotificationType.PROVIDER).toLowerCase(Locale.ROOT);
        return Map.of("provider", Character.toUpperCase(provider.charAt(0)) + provider.substring(1));
    }
}
