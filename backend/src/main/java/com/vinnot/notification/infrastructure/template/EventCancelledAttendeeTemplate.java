package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Objects;
import java.util.Set;
import java.util.Map;

/**
 * Tells an attendee their event was cancelled: why (a preset reason, plus the organizer's note for "other") and
 * what happens to their money. Copy lives in {@code email/event_cancelled_*}.
 */
public class EventCancelledAttendeeTemplate extends BundleEmailTemplate {
    private final String website;

    public EventCancelledAttendeeTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.EVENT_CANCELLED_ATTENDEE, "event_cancelled", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String title = required(request, "title");
        final String subject = copy.text("subject", Map.of("title", title));
        String reason = copy.text("reason." + required(request, "reason"));
        String note = request.data().get("note");
        String refund = copy.text("refund." + required(request, "refund"));
        String date = EventDates.of(request).format(required(request, "startDate"));
        String intro = copy.text("intro", Map.of("title", title));
        String url = website + "/events";
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(intro))
                .append(BrandedEmailTemplate.detail(copy.text("label.date"), date))
                .append(BrandedEmailTemplate.detail(copy.text("label.reason"), Objects.isNull(note) ? reason : reason + "\n" + note))
                .append(BrandedEmailTemplate.paragraph(refund))
                .append(BrandedEmailTemplate.action(url, copy.text("action"), language))
                .append(BrandedEmailTemplate.paragraph(copy.text("closing")));
        StringBuilder text = new StringBuilder(intro).append("\n\n")
                .append(copy.text("label.date")).append(": ").append(date).append('\n')
                .append(copy.text("label.reason")).append(": ").append(reason).append('\n');
        if (Objects.nonNull(note)) {
            text.append(note).append('\n');
        }
        text.append('\n').append(refund).append("\n\n").append(copy.text("action")).append(": ").append(url)
                .append("\n\n").append(copy.text("closing"));
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, intro, html.toString()));
    }
}
