package com.vinnot.event.domain.valueobject;

public enum EventRegistrationStatus {
    REQUESTED,
    AWAITING_PAYMENT,
    AWAITING_ATTENDEE_CONFIRMATION,
    CONFIRMED,
    WAITLISTED,
    REJECTED,
    CANCELLED,
    EXPIRED;

    public boolean holdsCapacity() {
        return this == AWAITING_PAYMENT || this == AWAITING_ATTENDEE_CONFIRMATION;
    }

    public boolean isTerminal() {
        return this == REJECTED || this == CANCELLED || this == EXPIRED;
    }
}
