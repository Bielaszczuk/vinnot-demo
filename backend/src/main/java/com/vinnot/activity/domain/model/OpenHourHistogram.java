package com.vinnot.activity.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Map;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.TreeMap;

/** How many recorded app opens fell in each hour of the day, in the user's own time zone. */
public record OpenHourHistogram(Map<Integer, Integer> countsByHour) {
    private static final int LAST_HOUR = 23;

    public OpenHourHistogram {
        countsByHour = Map.copyOf(Objects.requireNonNullElse(countsByHour, Map.of()));
        countsByHour.forEach((hour, count) -> {
            if (hour < 0 || hour > LAST_HOUR || count < 1) {
                throw new DomainException("INVALID_OPEN_HOUR", "An open hour is 0-23 with a positive count");
            }
        });
    }

    public static OpenHourHistogram empty() {
        return new OpenHourHistogram(Map.of());
    }

    /** The hour with the most opens (the mode); a tie goes to the earliest hour. Empty without opens. */
    public OptionalInt usualHour() {
        int usual = -1;
        int most = 0;
        for (var entry : new TreeMap<>(countsByHour).entrySet()) {
            if (entry.getValue() > most) {
                usual = entry.getKey();
                most = entry.getValue();
            }
        }
        return usual < 0 ? OptionalInt.empty() : OptionalInt.of(usual);
    }

    public int opens() {
        return countsByHour.values().stream().mapToInt(Integer::intValue).sum();
    }
}
