package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/** Daily push outcome counts per type (#310). */
public interface PushMetricsPort {
    /** Adds the counts to the UTC day of {@code at}; it is kept even if the calling job later fails. */
    void record(NotificationType type, Map<PushOutcome, Integer> counts, Instant at);

    /** Totals per type and outcome from the start of {@code fromDay} (UTC). */
    Map<NotificationType, Map<PushOutcome, Long>> totalsSince(LocalDate fromDay);
}
