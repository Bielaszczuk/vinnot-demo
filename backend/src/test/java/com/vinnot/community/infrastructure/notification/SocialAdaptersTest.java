package com.vinnot.community.infrastructure.notification;

import com.vinnot.community.infrastructure.gamification.GamificationFollowerPointsAdapter;
import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** #541 S7: the follower point is keyed by the follower and the push is deduplicated per pair and day. */
class SocialAdaptersTest {
    private final UUID follower = UUID.randomUUID();
    private final UUID followee = UUID.randomUUID();

    @Test
    void queuesOneNewFollowerPushPerPairAndDay() {
        PushNotificationPort pushes = mock(PushNotificationPort.class);
        Clock clock = Clock.fixed(Instant.parse("2026-11-10T23:30:00Z"), ZoneOffset.UTC);
        new PushNewFollowerNotifier(pushes, clock).newFollower(followee, follower, "Ana Lopez");
        verify(pushes).push(new PushRequest(NotificationType.NEW_FOLLOWER, List.of(followee),
                Map.of("followerId", follower.toString(), "follower", "Ana Lopez"),
                "new-follower:" + follower + ":" + followee + ":2026-11-10"));
    }

    @Test
    void awardsAndRevokesTheFollowerPointKeyedByTheFollower() {
        AwardPointsUseCase points = mock(AwardPointsUseCase.class);
        var adapter = new GamificationFollowerPointsAdapter(points);
        adapter.followerGained(followee, follower);
        verify(points).award(new AwardPointsCommand(followee, PointSource.FOLLOWER_GAINED, follower.toString(), null));
        adapter.followerLost(followee, follower);
        verify(points).revoke(RevokePointsCommand.of(followee, PointSource.FOLLOWER_GAINED, follower.toString()));
    }
}
