package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Set;

/**
 * The organizer's Mercado Pago connection (#309): connected, or to be connected again with the reason
 * ({@code reason} REVOKED or EXPIRED). Both point to the payments page. Copy: {@code email/payment_account_*}.
 */
public class PaymentAccountNoticeTemplate extends BundleEmailTemplate {
    private final String key;
    private final String website;

    public PaymentAccountNoticeTemplate(NotificationType type, String key, BrandedEmailTemplate brand, String website) {
        super(type, "payment_account", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.key = key;
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        final String subject = copy.text(key + ".subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text(key + ".intro" + reason(request));
        String help = copy.text(key + ".help");
        String action = copy.text(key + ".action");
        String link = website + "/partner/payments";
        String text = greeting + "\n\n" + intro + "\n\n" + help + "\n" + action + ": " + link;
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.paragraph(help) + BrandedEmailTemplate.action(link, action, language);
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, intro, html));
    }

    /** Reconnection copy depends on why; an unknown reason reads as an expired connection. */
    private String reason(NotificationRequest request) {
        if (type() != NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED) {
            return "";
        }
        return "REVOKED".equals(request.data().get("reason")) ? ".REVOKED" : ".EXPIRED";
    }
}
