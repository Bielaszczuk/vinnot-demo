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
 * Tells the author that a moderator removed their review or comment (#307), with the report's reason when a report led
 * to it. Never names the reporter. Copy: {@code email/moderation_removed_*.properties}.
 */
public class ContentRemovedTemplate extends BundleEmailTemplate {
    private final String website;

    public ContentRemovedTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.CONTENT_REMOVED, "moderation_removed", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String kind = "COMMENT".equals(required(request, "kind")) ? "comment" : "review";
        final String subject = copy.text(kind + ".subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String reportReason = request.data().get("reportReason");
        String intro = copy.text(kind + (Objects.isNull(reportReason) ? ".intro" : ".reportedIntro"),
                Map.of("wine", required(request, "wineName")));
        String help = copy.text("help");
        String url = website + "/content-policy";
        String action = copy.text("action");
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro));
        StringBuilder text = new StringBuilder(greeting + "\n\n" + intro);
        if (Objects.nonNull(reportReason)) {
            String reason = reason(copy, reportReason);
            html.append(BrandedEmailTemplate.detail(copy.text("reason.label"), reason));
            text.append("\n").append(copy.text("reason.label")).append(": ").append(reason);
        }
        html.append(BrandedEmailTemplate.paragraph(help)).append(BrandedEmailTemplate.action(url, action, language));
        text.append("\n\n").append(help).append("\n").append(action).append(": ").append(url);
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, subject, html.toString()));
    }

    static String reason(EmailCopy copy, String code) {
        try {
            return copy.text("reason." + code.toUpperCase(Locale.ROOT));
        } catch (MissingResourceException unknown) {
            return copy.text("reason.OTHER");
        }
    }
}
