package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Set;

/**
 * One message to the organizer when someone else (the Vinnot team) cancelled their event, instead of one
 * message per cancelled registration. Copy: {@code email/event_summary_*.properties}.
 */
public class EventCancelledSummaryTemplate extends BundleEmailTemplate {
    private final String website;

    public EventCancelledSummaryTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.EVENT_CANCELLED_ORGANIZER_SUMMARY, "event_summary", brand,
                Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String title = required(request, "title");
        String subject = copy.text("subject");
        String intro = copy.text("intro");
        String registrations = required(request, "cancelledRegistrations");
        String date = EventDates.of(request).format(required(request, "startDate"));
        String action = copy.text("action");
        String url = website + "/partner/events";
        String html = BrandedEmailTemplate.paragraph(title) + BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.detail(copy.text("registrations"), registrations)
                + BrandedEmailTemplate.detail(copy.text("date"), date)
                + BrandedEmailTemplate.action(url, action, language);
        String text = title + "\n" + intro + "\n"
                + copy.text("registrations") + ": " + registrations + "\n"
                + copy.text("date") + ": " + date + "\n"
                + action + ": " + url;
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, title, html));
    }
}
