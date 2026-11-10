package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Locale;
import java.util.MissingResourceException;
import java.util.Set;

/**
 * Tells the reporter how their report ended (#307): {@code outcome} REMOVED, RESOLVED or DISMISSED, what they reported
 * ({@code targetType}) and why ({@code reason}). Never names the author. Copy: {@code email/moderation_report_*.properties}.
 */
public class ReportOutcomeTemplate extends BundleEmailTemplate {
    private final String website;

    public ReportOutcomeTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.REPORT_OUTCOME, "moderation_report", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        final String subject = copy.text("subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String outcome = label(copy, "outcome.", required(request, "outcome"), "RESOLVED");
        String target = label(copy, "target.", required(request, "targetType"), "OTHER");
        String reason = ContentRemovedTemplate.reason(copy, required(request, "reason"));
        String url = website + "/content-policy";
        String action = copy.text("action");
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(outcome)
                + BrandedEmailTemplate.detail(copy.text("target.label"), target)
                + BrandedEmailTemplate.detail(copy.text("reason.label"), reason)
                + BrandedEmailTemplate.paragraph(copy.text("thanks"))
                + BrandedEmailTemplate.action(url, action, language);
        String text = greeting + "\n\n" + outcome + "\n" + copy.text("target.label") + ": " + target + "\n"
                + copy.text("reason.label") + ": " + reason + "\n\n" + copy.text("thanks") + "\n" + action + ": " + url;
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, subject, html));
    }

    private static String label(EmailCopy copy, String prefix, String value, String fallback) {
        try {
            return copy.text(prefix + value.toUpperCase(Locale.ROOT));
        } catch (MissingResourceException unknown) {
            return copy.text(prefix + fallback);
        }
    }
}
