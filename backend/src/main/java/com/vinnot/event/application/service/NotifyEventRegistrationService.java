package com.vinnot.event.application.service;

import com.vinnot.event.application.port.in.NotifyEventRegistrationUseCase;
import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.port.out.OrganizerActivityDigest;
import com.vinnot.event.application.port.out.OrganizerActivityDigest.Activity;
import com.vinnot.event.application.query.response.EventRegistrationNotice;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns a database-trigger registration change into a notification. It runs inside the durable worker's
 * transaction, so the hand-off to the notification outbox commits together with the trigger job's removal. The
 * attendee also gets a push that opens the ticket, under the same key as the email. The organizer's push is not sent
 * per registration: confirmed places, requests and cancellations are added to the event's digest instead.
 */
@Service
@RequiredArgsConstructor
public class NotifyEventRegistrationService implements NotifyEventRegistrationUseCase {
    private final EventRegistrationNoticeReader reader;
    private final NotificationPort notifications;
    private final PushNotificationPort pushes;
    private final OrganizerActivityDigest digests;

    /** How long the organizer's digest collects activity after the first one. */
    static final Duration DIGEST_WINDOW = Duration.ofMinutes(15);

    @Override
    public void notify(UUID registrationId, long version, boolean organizer) {
        // Superseded states are obsolete; the latest transition owns its own durable job.
        reader.findCurrent(registrationId, version, organizer).ifPresent(notice -> {
            String key = "event-registration:" + registrationId + ":" + version + ":" + (organizer ? "ORGANIZER" : "ATTENDEE");
            notifications.enqueue(NotificationRequest.of(organizer ? NotificationType.EVENT_REGISTRATION_ORGANIZER
                            : NotificationType.EVENT_REGISTRATION_ATTENDEE,
                    NotificationRecipient.address(notice.recipient(), null),
                    NotificationLocale.fromLanguage(notice.language()), data(notice), key));
            if (organizer) {
                activity(notice).ifPresent(activity -> digests.add(notice.eventId(), notice.recipientId(), activity, DIGEST_WINDOW));
            } else {
                pushes.push(new PushRequest(NotificationType.EVENT_REGISTRATION_ATTENDEE, List.of(notice.recipientId()),
                        Map.of("registrationId", registrationId.toString(), "title", notice.title(),
                                "status", notice.status(), "paymentStatus", notice.paymentStatus()), key));
            }
        });
    }

    private static Optional<Activity> activity(EventRegistrationNotice notice) {
        return switch (notice.status()) {
            case "CONFIRMED" -> "REFUNDED".equals(notice.paymentStatus()) ? Optional.empty() : Optional.of(Activity.CONFIRMED);
            case "REQUESTED" -> Optional.of(Activity.REQUESTED);
            // A reported transfer waits for the organizer to verify it.
            case "AWAITING_PAYMENT" -> "REPORTED".equals(notice.paymentStatus()) ? Optional.of(Activity.REQUESTED) : Optional.empty();
            case "CANCELLED" -> Optional.of(Activity.CANCELLED);
            default -> Optional.empty();
        };
    }

    private static Map<String, String> data(EventRegistrationNotice notice) {
        Map<String, String> data = new HashMap<>();
        data.put("registrationId", notice.registrationId().toString());
        data.put("title", notice.title());
        data.put("status", notice.status());
        data.put("paymentStatus", notice.paymentStatus());
        data.put("attendees", Integer.toString(notice.attendees()));
        data.put("startDate", notice.startDate().toString());
        data.put("timeZone", notice.timeZone());
        putIfPresent(data, "expiresAt", Objects.toString(notice.expiresAt(), null));
        putIfPresent(data, "contactName", notice.contactName());
        putIfPresent(data, "contactPhone", notice.contactPhone());
        return data;
    }

    private static void putIfPresent(Map<String, String> data, String key, String value) {
        if (Objects.nonNull(value)) {
            data.put(key, value);
        }
    }
}
