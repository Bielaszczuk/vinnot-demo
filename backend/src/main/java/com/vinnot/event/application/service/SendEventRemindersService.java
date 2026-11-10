package com.vinnot.event.application.service;

import com.vinnot.event.application.port.in.SendEventRemindersUseCase;
import com.vinnot.event.application.port.out.EventReminderStore;
import com.vinnot.event.application.port.out.EventReminderStore.DueReminder;
import com.vinnot.event.application.port.out.EventReminderStore.Window;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Reminds each confirmed attendee twice. About a day before (events starting in one to 24 hours) they get an email,
 * plus a push that may wait out their quiet hours and expires when the second reminder takes over; an event closer
 * than two hours gets no day-before push, the second one covers it. About two hours before (events starting in 15
 * minutes to two hours) they get a push only, at once. Email and push keys carry the event start, so a rescheduled
 * event is reminded again instead of the corrected reminder being deduplicated against the stale one. A registration is claimed and its reminder queued in one transaction, so a failure leaves it
 * unclaimed for the next run.
 */
@Service
@RequiredArgsConstructor
public class SendEventRemindersService implements SendEventRemindersUseCase {
    static final Duration AHEAD = Duration.ofHours(24);
    static final Duration SOON = Duration.ofHours(2);
    static final Duration EMAIL_TOO_LATE = Duration.ofHours(1);
    static final Duration TOO_LATE = Duration.ofMinutes(15);
    static final int BATCH = 200;
    private final EventReminderStore reminders;
    private final NotificationPort notifications;
    private final PushNotificationPort pushes;

    @Override
    @Transactional
    public int execute(Instant now) {
        List<DueReminder> dayBefore = reminders.claimDue(Window.DAY_BEFORE, now.plus(EMAIL_TOO_LATE), now.plus(AHEAD), now, BATCH);
        for (DueReminder reminder : dayBefore) {
            Map<String, String> data = data(reminder);
            String key = "reminder:" + reminder.registrationId() + ":24h:" + reminder.startDate().getEpochSecond();
            notifications.enqueue(NotificationRequest.of(NotificationType.EVENT_REMINDER,
                    NotificationRecipient.address(reminder.recipient(), null), NotificationLocale.fromLanguage(reminder.language()),
                    data, key));
            if (reminder.startDate().isAfter(now.plus(SOON))) {
                push(reminder, data, Window.DAY_BEFORE, key, true,
                        reminder.startDate().minus(SOON));
            }
        }
        List<DueReminder> soon = reminders.claimDue(Window.SOON, now.plus(TOO_LATE), now.plus(SOON), now, BATCH);
        for (DueReminder reminder : soon) {
            push(reminder, data(reminder), Window.SOON,
                    "reminder:" + reminder.registrationId() + ":2h:" + reminder.startDate().getEpochSecond(), false,
                    reminder.startDate());
        }
        return dayBefore.size() + soon.size();
    }

    private void push(DueReminder reminder, Map<String, String> data, Window window, String key, boolean deferrable,
            Instant expiresAt) {
        Map<String, String> message = new HashMap<>(data);
        message.put("window", window.name());
        pushes.push(new PushRequest(NotificationType.EVENT_REMINDER, List.of(reminder.userId()), message, key, deferrable,
                expiresAt));
    }

    private static Map<String, String> data(DueReminder reminder) {
        Map<String, String> data = new HashMap<>();
        data.put("title", reminder.title());
        data.put("startDate", reminder.startDate().toString());
        data.put("timeZone", Objects.requireNonNullElse(reminder.timeZone(), "UTC"));
        data.put("registrationId", reminder.registrationId().toString());
        if (Objects.nonNull(reminder.venue())) {
            data.put("venue", reminder.venue());
        }
        return data;
    }
}
