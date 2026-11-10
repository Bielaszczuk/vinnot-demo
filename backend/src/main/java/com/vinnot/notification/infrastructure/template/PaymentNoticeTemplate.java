package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Receipt, refund and chargeback emails ({@code email/payment_*}). The buyer is sent to their ticket and the
 * organizer to their payments page. Refund emails choose their wording from {@code audience}; a rejected refund and
 * a chargeback are written for the organizer only.
 */
public class PaymentNoticeTemplate extends BundleEmailTemplate {
    static final String BUNDLE = "payment";
    private final String key;
    private final String website;

    public PaymentNoticeTemplate(NotificationType type, String key, BrandedEmailTemplate brand, String website) {
        super(type, BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.key = key;
        this.website = website.endsWith("/") ? website.substring(0, website.length() - 1) : website;
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        boolean organizerOnly = type() == NotificationType.PAYMENT_CHARGEBACK || type() == NotificationType.PAYMENT_REFUND_REJECTED;
        boolean organizer = organizerOnly || "ORGANIZER".equals(request.data().get("audience"));
        final String subject = copy.text(key + ".subject", Map.of("title", required(request, "title")));
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text(type() == NotificationType.PAYMENT_RECEIPT || organizerOnly
                ? key + ".intro" : key + ".intro." + (organizer ? "ORGANIZER" : "BUYER"));
        String amountLabel = copy.text(type() == NotificationType.PAYMENT_REFUNDED ? "label.refunded" : "label.amount");
        StringBuilder text = new StringBuilder(greeting).append("\n\n").append(intro).append("\n\n");
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(greeting)).append(BrandedEmailTemplate.paragraph(intro));
        row(text, html, copy.text("label.event"), required(request, "title"));
        row(text, html, amountLabel, money(request));
        if (type() == NotificationType.PAYMENT_RECEIPT) {
            row(text, html, copy.text("label.date"), EventDates.of(request).format(required(request, "paidAt")));
        }
        row(text, html, copy.text("label.reference"), required(request, "reference"));
        if (type() == NotificationType.PAYMENT_REFUND_REJECTED) {
            row(text, html, copy.text("label.reason"), required(request, "reason"));
            String retry = copy.text(key + ".retry");
            text.append('\n').append(retry).append('\n');
            html.append(BrandedEmailTemplate.paragraph(retry));
        }
        String link = organizer ? website + "/partner/payments" : website + "/my-tickets/" + required(request, "registrationId");
        String action = copy.text(organizer ? "organizer.action" : "buyer.action");
        text.append('\n').append(action).append(": ").append(link);
        html.append(BrandedEmailTemplate.action(link, action, language));
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, intro, html.toString()));
    }

    private static void row(StringBuilder text, StringBuilder html, String label, String value) {
        text.append(label).append(": ").append(value).append('\n');
        html.append(BrandedEmailTemplate.detail(label, value));
    }

    /** For example "10.000,00 ARS" in Spanish and "10,000.00 ARS" in English. */
    private static String money(NotificationRequest request) {
        NumberFormat format = NumberFormat.getNumberInstance(Locale.forLanguageTag(
                request.locale() == NotificationLocale.ES ? "es-AR" : "en-US"));
        format.setMinimumFractionDigits(2);
        format.setMaximumFractionDigits(2);
        return format.format(new BigDecimal(required(request, "amount"))) + " " + required(request, "currency");
    }
}
