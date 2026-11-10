package com.vinnot.event.domain.valueobject;

/**
 * Enumeration of event statuses.
 */
public enum EventStatus {

    /**
     * Event is in draft mode, not visible to public.
     */
    DRAFT,

    /**
     * Event is published and visible.
     */
    PUBLISHED,

    /**
     * Event has been cancelled.
     */
    CANCELLED,

    /**
     * Event has been postponed.
     */
    POSTPONED,

    /**
     * Event is sold out.
     */
    SOLD_OUT,

    /**
     * Event has completed.
     */
    COMPLETED
}

