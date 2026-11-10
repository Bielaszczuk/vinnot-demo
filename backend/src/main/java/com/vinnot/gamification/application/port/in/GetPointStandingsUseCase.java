package com.vinnot.gamification.application.port.in;

import com.vinnot.gamification.application.query.response.PointStanding;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** Points and seal of many members in one read, for lists that show them next to a name (never one query per row). */
public interface GetPointStandingsUseCase {
    /**
     * @param userIds the members
     * @return the standing of each existing member; members that do not exist are missing
     */
    Map<UUID, PointStanding> standings(Collection<UUID> userIds);

    /** The seal key of each member that shows one: locked and inactive members are missing. */
    Map<UUID, String> badgeTiers(Collection<UUID> userIds);
}
