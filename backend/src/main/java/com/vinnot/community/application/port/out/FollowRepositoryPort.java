package com.vinnot.community.application.port.out;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Who follows whom (#541). Writes join the caller's transaction. */
public interface FollowRepositoryPort {
    /**
     * Serialises every follow change and block between two members until the transaction ends, so a follow can never
     * survive a block that commits at the same time. The order of the two members does not matter.
     */
    void lockPair(UUID first, UUID second);

    /** The member when they exist and are active. */
    Optional<Member> findActiveMember(UUID userId);

    /** @return whether a new follow was stored (false when it already existed) */
    boolean follow(UUID follower, UUID followee);

    /** @return whether a follow was removed */
    boolean unfollow(UUID follower, UUID followee);

    /** Removes the follows in both directions and returns the ones that existed. */
    List<FollowPair> removeBetween(UUID first, UUID second);

    /** A follower counts for points once they verified their email and have at least one approved review. */
    boolean qualifiesForFollowerPoints(UUID follower);

    record Member(UUID id, String username, String firstName, String lastName) { }

    record FollowPair(UUID followerId, UUID followeeId) { }
}
