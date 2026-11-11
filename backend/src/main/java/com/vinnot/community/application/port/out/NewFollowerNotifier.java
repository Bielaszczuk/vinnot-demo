package com.vinnot.community.application.port.out;

import java.util.UUID;

/** Tells a member that someone started following them (#541), in the follow's transaction. */
public interface NewFollowerNotifier {
    void newFollower(UUID followee, UUID follower, String followerName);
}
