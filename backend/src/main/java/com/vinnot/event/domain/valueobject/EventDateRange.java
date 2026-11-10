package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.time.Instant;
import java.util.Objects;

public final class EventDateRange extends ValueObject {

    private final Instant startDate;
    private final Instant endDate;

    private EventDateRange(Instant startDate, Instant endDate) {
        validate(startDate, endDate);
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /**
     * Creates an EventDateRange.
     *
     * @param startDate the start date and time
     * @param endDate   the end date and time
     * @return the EventDateRange value object
     */
    public static EventDateRange of(Instant startDate, Instant endDate) {
        return new EventDateRange(startDate, endDate);
    }

    private void validate(Instant start, Instant end) {
        Objects.requireNonNull(start, "Start date cannot be null");
        Objects.requireNonNull(end, "End date cannot be null");

        if (end.isBefore(start)) {
            throw new DomainException("INVALID_DATE_RANGE", "End date cannot be before start date");
        }
    }

    /**
     * Gets the start date.
     *
     * @return the start date
     */
    public Instant getStartDate() {
        return startDate;
    }

    /**
     * Gets the end date.
     *
     * @return the end date
     */
    public Instant getEndDate() {
        return endDate;
    }

    /**
     * Checks if the event is in the future.
     *
     * @return true if start date is after now
     */
    public boolean isFuture() {
        return startDate.isAfter(Instant.now());
    }

    /**
     * Checks if the event is currently ongoing.
     *
     * @return true if now is between start and end
     */
    public boolean isOngoing() {
        Instant now = Instant.now();
        return now.isAfter(startDate) && now.isBefore(endDate);
    }

    /**
     * Checks if the event has passed.
     *
     * @return true if end date is before now
     */
    public boolean isPast() {
        return endDate.isBefore(Instant.now());
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{startDate, endDate};
    }

    @Override
    public String toString() {
        return String.format("%s - %s", startDate, endDate);
    }
}

