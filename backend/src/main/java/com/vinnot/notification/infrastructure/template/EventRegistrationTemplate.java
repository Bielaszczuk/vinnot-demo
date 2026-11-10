package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Objects;
import java.util.Set;

/** Registration status change, for the attendee or for the event organizer. Copy: {@code email/events_*.properties}. */
public class EventRegistrationTemplate extends BundleEmailTemplate {
    private final boolean organizer;
    private final String website;

    public EventRegistrationTemplate(NotificationType type, boolean organizer, BrandedEmailTemplate brand, String website) {
        super(type, "events", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.organizer = organizer;
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        final var date = EventDates.of(request);
        String title = required(request, "title");
        final String subject = copy.text(organizer ? "organizerSubject" : "subject");
        final String action = copy.text(organizer ? "organizerAction" : "action");
        final String url = website + (organizer ? "/partner/events" : "/my-tickets/" + required(request, "registrationId"));
        var html = new StringBuilder(BrandedEmailTemplate.paragraph(title));
        var text = new StringBuilder(title).append("\n");
        detail(html, text, copy.text("status"), copy.text(required(request, "status")));
        detail(html, text, copy.text("payment"), copy.text("payment." + required(request, "paymentStatus")));
        detail(html, text, copy.text("people"), required(request, "attendees"));
        detail(html, text, copy.text("date"), date.format(required(request, "startDate")));
        String expiresAt = request.data().get("expiresAt");
        if (Objects.nonNull(expiresAt)) {
            detail(html, text, copy.text("expires"), date.format(expiresAt));
        }
        if (organizer) {
            // A missing contact name has always rendered as "null"; kept identical until the copy is revised.
            detail(html, text, copy.text("contact"), String.valueOf(request.data().get("contactName")) + "\n"
                    + request.data().getOrDefault("contactPhone", ""));
        }
        html.append(BrandedEmailTemplate.action(url, action, language));
        text.append(action).append(": ").append(url);
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, title, html.toString()));
    }

    private static void detail(StringBuilder html, StringBuilder text, String label, String value) {
        html.append(BrandedEmailTemplate.detail(label, value));
        text.append(label).append(": ").append(value).append("\n");
    }
}
