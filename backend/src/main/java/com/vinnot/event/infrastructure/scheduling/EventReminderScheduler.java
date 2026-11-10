package com.vinnot.event.infrastructure.scheduling;

import com.vinnot.event.application.port.in.SendEventRemindersUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Runs the reminder use case every few minutes; each run sends at most one batch. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.events.reminders.enabled", havingValue = "true", matchIfMissing = true)
public class EventReminderScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(EventReminderScheduler.class);
    private final SendEventRemindersUseCase reminders;

    @Scheduled(
            initialDelayString = "${app.events.reminders.initial-delay-ms:60000}",
            fixedDelayString = "${app.events.reminders.delay-ms:300000}")
    public void sendDue() {
        int queued = reminders.execute(Instant.now());
        if (queued > 0) {
            LOGGER.info("Queued {} event reminder(s)", queued);
        }
    }
}
