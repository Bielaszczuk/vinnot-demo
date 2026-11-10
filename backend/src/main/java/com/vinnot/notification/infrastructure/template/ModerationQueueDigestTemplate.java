package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * The moderation team's digest (#307): one new item is named (the wine, or the report's reason), several are counted.
 * Each queue with work gets a button to it. Copy: {@code email/moderation_digest_*.properties}.
 */
public class ModerationQueueDigestTemplate extends BundleEmailTemplate {
    private final String website;

    public ModerationQueueDigestTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.MODERATION_QUEUE_DIGEST, "moderation_digest", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        int submissions = Integer.parseInt(required(request, "submissions"));
        int reports = Integer.parseInt(required(request, "reports"));
        String wineName = request.data().get("wineName");
        String reportReason = request.data().get("reportReason");
        final String subject = subject(copy, submissions, reports);
        String greeting = greeting(copy, request.recipient().displayName());
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(greeting));
        StringBuilder text = new StringBuilder(greeting + "\n");
        if (submissions > 0) {
            String line = submissions > 1 ? copy.text("submissions.many", Map.of("count", Integer.toString(submissions)))
                    : Objects.nonNull(wineName) ? copy.text("submissions.one", Map.of("wine", wineName))
                    : copy.text("submissions.single");
            append(html, text, line, website + "/admin/wine-submissions", copy.text("submissions.action"), language);
        }
        if (reports > 0) {
            String line = reports > 1 ? copy.text("reports.many", Map.of("count", Integer.toString(reports)))
                    : Objects.nonNull(reportReason) ? copy.text("reports.one", Map.of("reason", ContentRemovedTemplate.reason(copy, reportReason)))
                    : copy.text("reports.single");
            append(html, text, line, website + "/admin/community", copy.text("reports.action"), language);
        }
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, subject, html.toString()));
    }

    private static String subject(EmailCopy copy, int submissions, int reports) {
        if (submissions + reports > 1) {
            return copy.text("subject.many");
        }
        return copy.text(submissions == 1 ? "subject.submission" : "subject.report");
    }

    private static void append(StringBuilder html, StringBuilder text, String line, String url, String action,
            BrandedEmailTemplate.Language language) {
        html.append(BrandedEmailTemplate.paragraph(line)).append(BrandedEmailTemplate.action(url, action, language));
        text.append("\n").append(line).append("\n").append(action).append(": ").append(url).append("\n");
    }
}
