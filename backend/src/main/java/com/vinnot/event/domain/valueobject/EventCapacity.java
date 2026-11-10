package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;

public final class EventCapacity extends ValueObject {

    private final Integer maxAttendees;
    private final int currentAttendees;
    private final int heldAttendees;

    private EventCapacity(Integer maxAttendees, int currentAttendees, int heldAttendees) {
        validate(maxAttendees, currentAttendees, heldAttendees);
        this.maxAttendees = maxAttendees;
        this.currentAttendees = currentAttendees;
        this.heldAttendees = heldAttendees;
    }

    /**
     * Creates an EventCapacity with a maximum limit.
     *
     * @param maxAttendees the maximum number of attendees (null for unlimited)
     * @return the EventCapacity value object
     */
    public static EventCapacity withLimit(Integer maxAttendees) {
        return new EventCapacity(maxAttendees, 0, 0);
    }

    /**
     * Creates an EventCapacity with no limit.
     *
     * @return unlimited EventCapacity
     */
    public static EventCapacity unlimited() {
        return new EventCapacity(null, 0, 0);
    }

    /**
     * Creates an EventCapacity from existing values.
     *
     * @param maxAttendees     the maximum attendees
     * @param currentAttendees the current count
     * @return the EventCapacity value object
     */
    public static EventCapacity of(Integer maxAttendees, int currentAttendees) {
        return new EventCapacity(maxAttendees, currentAttendees, 0);
    }

    public static EventCapacity of(Integer maxAttendees, int currentAttendees, int heldAttendees) {
        return new EventCapacity(maxAttendees, currentAttendees, heldAttendees);
    }

    private void validate(Integer max, int current, int held) {
        if (current < 0 || held < 0) {
            throw new DomainException(
                    "INVALID_ATTENDANCE",
                    "Confirmed and held attendees cannot be negative");
        }
        if (Objects.nonNull(max) && max < 0) {
            throw new DomainException("INVALID_CAPACITY", "Maximum attendees cannot be negative");
        }
        if (Objects.nonNull(max) && current + held > max) {
            throw new DomainException(
                    "CAPACITY_EXCEEDED",
                    "Confirmed and held attendees exceed maximum capacity");
        }
    }

    /**
     * Gets the maximum attendees.
     *
     * @return the max (null if unlimited)
     */
    public Integer getMaxAttendees() {
        return maxAttendees;
    }

    /**
     * Gets the current attendee count.
     *
     * @return the current count
     */
    public int getCurrentAttendees() {
        return currentAttendees;
    }

    public int getHeldAttendees() {
        return heldAttendees;
    }

    /**
     * Checks if the event has a capacity limit.
     *
     * @return true if limited
     */
    public boolean hasLimit() {
        return Objects.nonNull(maxAttendees);
    }

    /**
     * Checks if there are available spots.
     *
     * @return true if spots available
     */
    public boolean hasAvailableSpots() {
        if (!hasLimit()) {
            return true;
        }
        return currentAttendees + heldAttendees < maxAttendees;
    }

    /**
     * Gets the number of available spots.
     *
     * @return available spots (null if unlimited)
     */
    public Integer getAvailableSpots() {
        if (!hasLimit()) {
            return null;
        }
        return Math.max(0, maxAttendees - currentAttendees - heldAttendees);
    }

    /**
     * Checks if the event is sold out.
     *
     * @return true if no spots available
     */
    public boolean isSoldOut() {
        return hasLimit() && currentAttendees + heldAttendees >= maxAttendees;
    }

    /**
     * Returns a new capacity with one more attendee.
     *
     * @return updated capacity
     */
    public EventCapacity incrementAttendees() {
        return confirm(1);
    }

    /**
     * Returns a new capacity with one fewer attendee.
     *
     * @return updated capacity
     */
    public EventCapacity decrementAttendees() {
        return releaseConfirmed(1);
    }

    public EventCapacity hold(int attendeeCount) {
        validatePositiveCount(attendeeCount);
        ensureAvailable(attendeeCount);
        return new EventCapacity(maxAttendees, currentAttendees, heldAttendees + attendeeCount);
    }

    public EventCapacity releaseHold(int attendeeCount) {
        validatePositiveCount(attendeeCount);
        if (heldAttendees < attendeeCount) {
            throw new DomainException("INVALID_CAPACITY_RELEASE", "Held capacity is lower than requested release");
        }
        return new EventCapacity(maxAttendees, currentAttendees, heldAttendees - attendeeCount);
    }

    public EventCapacity confirmHold(int attendeeCount) {
        validatePositiveCount(attendeeCount);
        if (heldAttendees < attendeeCount) {
            throw new DomainException("INVALID_CAPACITY_CONFIRMATION", "Capacity is not held for this registration");
        }
        return new EventCapacity(
                maxAttendees,
                currentAttendees + attendeeCount,
                heldAttendees - attendeeCount);
    }

    public EventCapacity confirm(int attendeeCount) {
        validatePositiveCount(attendeeCount);
        ensureAvailable(attendeeCount);
        return new EventCapacity(maxAttendees, currentAttendees + attendeeCount, heldAttendees);
    }

    public EventCapacity releaseConfirmed(int attendeeCount) {
        validatePositiveCount(attendeeCount);
        if (currentAttendees < attendeeCount) {
            throw new DomainException(
                    "INVALID_CAPACITY_RELEASE",
                    "Confirmed capacity is lower than requested release");
        }
        return new EventCapacity(maxAttendees, currentAttendees - attendeeCount, heldAttendees);
    }

    private void ensureAvailable(int attendeeCount) {
        if (hasLimit() && currentAttendees + heldAttendees + attendeeCount > maxAttendees) {
            throw new DomainException("EVENT_SOLD_OUT", "There are not enough available spots");
        }
    }

    private void validatePositiveCount(int attendeeCount) {
        if (attendeeCount < 1) {
            throw new DomainException("INVALID_ATTENDEE_COUNT", "Attendee count must be positive");
        }
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{maxAttendees, currentAttendees, heldAttendees};
    }

    @Override
    public String toString() {
        if (hasLimit()) {
            return String.format("%d confirmed, %d held / %d", currentAttendees, heldAttendees, maxAttendees);
        }
        return String.format("%d confirmed, %d held (unlimited)", currentAttendees, heldAttendees);
    }
}
