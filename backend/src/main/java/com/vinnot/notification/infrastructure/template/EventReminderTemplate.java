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
 * Reminds a confirmed attendee about their event about a day before: local date and time, venue and a link to the
 * ticket. Copy lives in {@code email/event_reminder_*}.
 */
public class EventReminderTemplate extends BundleEmailTemplate {
    private final String website;

    public EventReminderTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.EVENT_REMINDER, "event_reminder", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String title = required(request, "title");
        final String subject = copy.text("subject", Map.of("title", title));
        String intro = copy.text("intro", Map.of("title", title));
        String date = EventDates.of(request).format(required(request, "startDate"));
        String venue = Objects.requireNonNullElse(request.data().get("venue"), copy.text("venue.pending"));
        String url = website + "/my-tickets/" + required(request, "registrationId");
        String html = BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.detail(copy.text("label.date"), date)
                + BrandedEmailTemplate.detail(copy.text("label.venue"), venue)
                + BrandedEmailTemplate.paragraph(copy.text("note"))
                + BrandedEmailTemplate.action(url, copy.text("action"), language)
                + BrandedEmailTemplate.paragraph(copy.text("closing"));
        String text = intro + "\n\n" + copy.text("label.date") + ": " + date + "\n" + copy.text("label.venue") + ": " + venue
                + "\n\n" + copy.text("note") + "\n\n" + copy.text("action") + ": " + url + "\n\n" + copy.text("closing");
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, intro, html));
    }
}
