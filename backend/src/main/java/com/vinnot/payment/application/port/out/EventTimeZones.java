package com.vinnot.payment.application.port.out;

import java.util.UUID;

/** The venue time zone of an event (an IANA id), so payment emails show dates in the event's local time. */
public interface EventTimeZones {
    String of(UUID eventId);
}
