package com.vinnot.event.domain.valueobject;

/** Why an organizer cancelled an event. Chosen from a list; {@link #UNFORESEEN_CIRCUMSTANCES} is preselected. */
public enum EventCancellationReason {
    UNFORESEEN_CIRCUMSTANCES,
    SCHEDULING_CONFLICT,
    VENUE_UNAVAILABLE,
    INSUFFICIENT_ATTENDANCE,
    WEATHER,
    HEALTH_AND_SAFETY,
    OTHER
}
