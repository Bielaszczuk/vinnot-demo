package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

/** Contact-form message for the support inbox. Replies go to the person who wrote it. */
@Component
public class SupportRequestTemplate extends BundleEmailTemplate {
    private static final int REFERENCE_SUFFIX_LENGTH = 12;

    public SupportRequestTemplate(BrandedEmailTemplate brand) {
        super(NotificationType.SUPPORT_REQUEST, "support", brand, Set.of(NotificationLocale.EN));
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String requestId = required(request, "requestId");
        String reference = displayReference(requestId);
        String category = required(request, "subject");
        String name = required(request, "name");
        String email = required(request, "email");
        String message = required(request, "message");
        String text = copy.text("reference") + ": " + reference + "\n" + copy.text("requestId") + ": " + requestId
                + "\n" + copy.text("category") + ": " + category + "\n" + copy.text("name") + ": " + name
                + "\n" + copy.text("replyEmail") + ": " + email + "\n\n" + message;
        String html = BrandedEmailTemplate.detail(copy.text("reference"), reference)
                + BrandedEmailTemplate.detail(copy.text("requestId"), requestId)
                + BrandedEmailTemplate.detail(copy.text("category"), category)
                + BrandedEmailTemplate.detail(copy.text("name"), name)
                + BrandedEmailTemplate.detail(copy.text("replyEmail"), email)
                + BrandedEmailTemplate.paragraph(message);
        return new RenderedNotification(copy.text("subject"), brand().text(language, text),
                brand().html(language, copy.text("title"), copy.text("preheader"), html), email);
    }

    /** Presentation reference, never an identity or lookup key. */
    static String displayReference(String requestId) {
        return requestId.matches("(?i)[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}")
                ? "VIN-" + requestId.substring(requestId.length() - REFERENCE_SUFFIX_LENGTH).toUpperCase(Locale.ROOT)
                : requestId;
    }
}
