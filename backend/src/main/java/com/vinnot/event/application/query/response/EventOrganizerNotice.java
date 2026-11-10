package com.vinnot.event.application.query.response;

import java.util.UUID;

/** Who organizes an event, and how notices to them are written: their language and the event's IANA zone. */
public record EventOrganizerNotice(UUID organizerId, String language, String timeZone) {
}
