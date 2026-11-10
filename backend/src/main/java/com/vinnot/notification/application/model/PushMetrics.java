package com.vinnot.notification.application.model;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Push outcomes per type over the last {@code days} UTC days, today included, starting on {@code from}. */
public record PushMetrics(int days, LocalDate from, List<TypeCounts> types) {
    public PushMetrics {
        types = List.copyOf(types);
    }

    /** Every outcome is present, zero when nothing happened. */
    public record TypeCounts(NotificationType type, Map<PushOutcome, Long> counts) {
        public TypeCounts {
            counts = Map.copyOf(counts);
        }
    }
}
