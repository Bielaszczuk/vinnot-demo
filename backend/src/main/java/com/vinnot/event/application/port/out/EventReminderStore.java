package com.vinnot.event.application.port.out;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Durable record of which confirmed registrations were already reminded about their event. */
public interface EventReminderStore {
    /**
     * Marks as reminded for that window, and returns, confirmed registrations of published or sold-out events starting after
     * {@code from} and no later than {@code until} that were not reminded yet. Concurrent callers never claim the
     * same registration.
     */
    List<DueReminder> claimDue(Window window, Instant from, Instant until, Instant claimedAt, int limit);

    /** Each reminder is claimed once per registration, independently of the other. */
    enum Window { DAY_BEFORE, SOON }

    /** Lets every registration of the event be reminded again, both reminders, after its date or time changed. */
    void rearm(UUID eventId);

    /** A registration to remind, with what the reminder shows. {@code venue} is null when none is set. */
    record DueReminder(UUID registrationId, UUID userId, String recipient, String language, String title, Instant startDate,
            String timeZone, String venue) {
    }
}
