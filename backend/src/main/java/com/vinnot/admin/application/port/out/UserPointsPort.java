package com.vinnot.admin.application.port.out;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** Members' points and seals for the admin lists (#455), one read per page. */
public interface UserPointsPort {
    /**
     * @param userIds the members on the page
     * @return each existing member's standing
     */
    Map<UUID, Standing> standings(Collection<UUID> userIds);

    /**
     * @param points    current points
     * @param badgeTier the seal shown, or null while the member is locked or inactive
     */
    record Standing(int points, String badgeTier) {
        public static final Standing NONE = new Standing(0, null);
    }
}
