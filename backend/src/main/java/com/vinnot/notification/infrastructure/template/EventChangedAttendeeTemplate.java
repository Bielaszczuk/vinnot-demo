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
 * Tells a confirmed attendee that the date, time or venue of their event changed: each changed value with what it
 * was before, in the event's time zone. Copy lives in {@code email/event_changed_*}.
 */
public class EventChangedAttendeeTemplate extends BundleEmailTemplate {
    private final String website;

    public EventChangedAttendeeTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.EVENT_CHANGED_ATTENDEE, "event_changed", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        Map<String, String> data = request.data();
        String title = required(request, "title");
        final String subject = copy.text("subject", Map.of("title", title));
        String intro = copy.text("intro", Map.of("title", title));
        EventDates dates = EventDates.of(request);
        String when = dates.format(required(request, "startDate")) + " – " + dates.format(required(request, "endDate"));
        String where = Objects.requireNonNullElse(data.get("venue"), copy.text("venue.pending"));
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(intro));
        StringBuilder text = new StringBuilder(intro).append("\n\n");
        if (data.containsKey("previousStartDate")) {
            String before = dates.format(data.get("previousStartDate")) + " – " + dates.format(required(request, "previousEndDate"));
            change(copy, "label.date", before, when, html, text);
        } else {
            unchanged(copy.text("label.date"), when, html, text);
        }
        if (data.containsKey("venueChanged")) {
            change(copy, "label.venue", Objects.requireNonNullElse(data.get("previousVenue"), copy.text("venue.pending")), where, html, text);
        } else {
            unchanged(copy.text("label.venue"), where, html, text);
        }
        String url = website + "/my-tickets/" + required(request, "registrationId");
        html.append(BrandedEmailTemplate.paragraph(copy.text("note")))
                .append(BrandedEmailTemplate.action(url, copy.text("action"), language));
        text.append('\n').append(copy.text("note")).append("\n\n").append(copy.text("action")).append(": ").append(url);
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, intro, html.toString()));
    }

    private static void change(EmailCopy copy, String label, String before, String after, StringBuilder html, StringBuilder text) {
        String value = copy.text("change", Map.of("before", before, "after", after));
        html.append(BrandedEmailTemplate.detail(copy.text(label), value));
        text.append(copy.text(label)).append(": ").append(value).append('\n');
    }

    private static void unchanged(String label, String value, StringBuilder html, StringBuilder text) {
        html.append(BrandedEmailTemplate.detail(label, value));
        text.append(label).append(": ").append(value).append('\n');
    }
}
