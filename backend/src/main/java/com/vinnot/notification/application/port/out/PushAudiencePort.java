package com.vinnot.notification.application.port.out;

import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** The active, unsuspended accounts among the requested ones, with the time zone quiet hours follow. */
public interface PushAudiencePort {
    List<Member> findActive(Collection<UUID> userIds);

    record Member(UUID userId, ZoneId timeZone) {
    }
}
