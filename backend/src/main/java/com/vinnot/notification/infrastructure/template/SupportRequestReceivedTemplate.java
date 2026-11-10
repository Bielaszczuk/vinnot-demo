package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Locale;
import java.util.Map;
import java.util.MissingResourceException;
import java.util.Set;

/**
 * Confirms to the requester that their support request arrived (#309), with its reference and subject. The form is
 * public, so the email carries nothing a stranger typed: no message, and a generic greeting even when a name is
 * known. Copy:
 * {@code email/support_received_*.properties}.
 */
public class SupportRequestReceivedTemplate extends BundleEmailTemplate {
    private final String website;

    public SupportRequestReceivedTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.SUPPORT_REQUEST_RECEIVED, "support_received", brand,
                Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String reference = SupportRequestTemplate.displayReference(required(request, "requestId"));
        final String subject = copy.text("subject", Map.of("reference", reference));
        String greeting = copy.text("greeting");
        String intro = copy.text("intro");
        String topic = topic(copy, required(request, "subject"));
        String more = copy.text("more");
        String url = website + "/contact";
        String action = copy.text("action");
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.detail(copy.text("reference"), reference)
                + BrandedEmailTemplate.detail(copy.text("topic"), topic)
                + BrandedEmailTemplate.paragraph(more) + BrandedEmailTemplate.action(url, action, language);
        String text = greeting + "\n\n" + intro + "\n" + copy.text("reference") + ": " + reference + "\n"
                + copy.text("topic") + ": " + topic + "\n\n" + more + "\n" + action + ": " + url;
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, intro, html));
    }

    private static String topic(EmailCopy copy, String code) {
        try {
            return copy.text("topic." + code.toLowerCase(Locale.ROOT));
        } catch (MissingResourceException unknown) {
            return copy.text("topic.other");
        }
    }
}
