package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Locale;
import java.util.Map;
import java.util.MissingResourceException;
import java.util.Objects;
import java.util.Set;

/**
 * What an administrator changed on the account (#309): a new role ({@code role}), a suspension with its preset reason
 * ({@code reasonCode}, plus {@code note} only for OTHER), its end, or a deletion. Unlike the self-service notices it
 * never says "if this wasn't you". Copy: {@code email/account_admin_*.properties}, keys prefixed by {@code key}.
 */
public class AccountAdministrationNoticeTemplate extends BundleEmailTemplate {
    private final String key;
    private final String website;

    public AccountAdministrationNoticeTemplate(NotificationType type, String key, BrandedEmailTemplate brand, String website) {
        super(type, "account_admin", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.key = key;
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        final String subject = copy.text(key + ".subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text(key + ".intro", Map.of("role", role(copy, request.data().get("role"))));
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro));
        StringBuilder text = new StringBuilder(greeting + "\n\n" + intro);
        String reasonCode = request.data().get("reasonCode");
        if (Objects.nonNull(reasonCode)) {
            String reason = label(copy, "reason.", reasonCode, "OTHER");
            html.append(BrandedEmailTemplate.detail(copy.text("reason.label"), reason));
            text.append("\n").append(copy.text("reason.label")).append(": ").append(reason);
            String note = request.data().get("note");
            if (Objects.nonNull(note)) {
                html.append(BrandedEmailTemplate.detail(copy.text("note.label"), note));
                text.append("\n").append(copy.text("note.label")).append(": ").append(note);
            }
        }
        String help = copy.text(key + ".help");
        String path = copy.text(key + ".path");
        String action = copy.text(key + ".action");
        html.append(BrandedEmailTemplate.paragraph(help)).append(BrandedEmailTemplate.action(website + path, action, language));
        text.append("\n\n").append(help).append("\n").append(action).append(": ").append(website).append(path);
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, intro, html.toString()));
    }

    private static String role(EmailCopy copy, String role) {
        return Objects.isNull(role) ? "" : label(copy, "role.", role, "USER");
    }

    private static String label(EmailCopy copy, String prefix, String value, String fallback) {
        try {
            return copy.text(prefix + value.toUpperCase(Locale.ROOT));
        } catch (MissingResourceException unknown) {
            return copy.text(prefix + fallback);
        }
    }
}
