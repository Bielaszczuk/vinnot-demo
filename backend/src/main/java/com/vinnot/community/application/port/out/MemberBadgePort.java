package com.vinnot.community.application.port.out;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** The seal shown next to each member's name, read in one call for a whole page. */
public interface MemberBadgePort {
    /** @return the tier key of each member that shows a seal; locked and inactive members are missing */
    Map<UUID, String> badgeTiers(Collection<UUID> userIds);
}
