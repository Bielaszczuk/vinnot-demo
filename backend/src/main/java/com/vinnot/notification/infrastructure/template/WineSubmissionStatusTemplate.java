package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.MissingResourceException;
import java.util.Objects;
import java.util.Set;

/**
 * Tells a contributor that the review status of their wine proposal changed. The status (also raw values
 * from rows queued before this template) and automatic reason codes render as localized copy; an unknown
 * value falls back to neutral copy instead of being shown. A free-text reason is shown as written.
 */
@Component
public class WineSubmissionStatusTemplate extends BundleEmailTemplate {
    public WineSubmissionStatusTemplate(BrandedEmailTemplate brand) {
        super(NotificationType.WINE_SUBMISSION_STATUS, "submission", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String subject = copy.text("subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String status = copy.text("statusChanged", Map.of("wineName", required(request, "wineName"),
                "status", label(copy, "status." + required(request, "status"), "status.unknown")));
        String reason = reason(request, copy);
        String text = greeting + "\n\n" + status + " " + reason;
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(status)
                + BrandedEmailTemplate.detail(copy.text("observations"), reason);
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, subject, html));
    }

    private static String reason(NotificationRequest request, EmailCopy copy) {
        String code = request.data().get("reasonCode");
        if (Objects.nonNull(code)) {
            return label(copy, "reason." + code, "noObservations");
        }
        return Objects.requireNonNullElse(request.data().get("reason"), copy.text("noObservations"));
    }

    private static String label(EmailCopy copy, String key, String fallbackKey) {
        try {
            return copy.text(key);
        } catch (MissingResourceException unknown) {
            return copy.text(fallbackKey);
        }
    }
}
