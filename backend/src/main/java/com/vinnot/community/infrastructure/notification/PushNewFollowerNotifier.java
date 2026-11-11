package com.vinnot.community.infrastructure.notification;

import com.vinnot.community.application.port.out.NewFollowerNotifier;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Queues the {@link NotificationType#NEW_FOLLOWER} push in the follow's transaction (durable outbox). The key names
 * the pair and the UTC day, so following, unfollowing and following again pushes at most once a day; the community
 * preference is checked at delivery.
 */
@Component
public class PushNewFollowerNotifier implements NewFollowerNotifier {
    private final PushNotificationPort pushes;
    private final Clock clock;

    @Autowired
    public PushNewFollowerNotifier(PushNotificationPort pushes) {
        this(pushes, Clock.systemUTC());
    }

    PushNewFollowerNotifier(PushNotificationPort pushes, Clock clock) {
        this.pushes = pushes;
        this.clock = clock;
    }

    @Override
    public void newFollower(UUID followee, UUID follower, String followerName) {
        pushes.push(new PushRequest(NotificationType.NEW_FOLLOWER, List.of(followee),
                Map.of("followerId", follower.toString(), "follower", followerName),
                "new-follower:" + follower + ":" + followee + ":" + LocalDate.now(clock)));
    }
}
