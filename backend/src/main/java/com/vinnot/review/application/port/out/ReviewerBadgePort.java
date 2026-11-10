package com.vinnot.review.application.port.out;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** The wax-seal tier shown next to each reviewer's name (#455), for a whole page in one read. */
public interface ReviewerBadgePort {
    /**
     * @param userIds the reviewers and commenters on the page
     * @return the tier key of each member that shows a seal; locked and inactive members are missing
     */
    Map<UUID, String> badgeTiers(Collection<UUID> userIds);
}
