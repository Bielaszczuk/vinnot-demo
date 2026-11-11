package com.vinnot.community.application.port.out;

import java.util.UUID;

/** Points for followers (#541): one per qualified follower, taken back when the follow ends. */
public interface FollowerPointsPort {
    void followerGained(UUID followee, UUID follower);

    void followerLost(UUID followee, UUID follower);
}
