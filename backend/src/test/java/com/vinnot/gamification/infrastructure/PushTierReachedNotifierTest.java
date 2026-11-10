package com.vinnot.gamification.infrastructure;

import com.vinnot.gamification.domain.model.Tier;
import com.vinnot.gamification.infrastructure.notification.PushTierReachedNotifier;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** S6: one push per member and tier, through the durable push outbox. */
class PushTierReachedNotifierTest {

    @Test
    void queuesOnePushKeyedByMemberAndTier() {
        PushNotificationPort pushes = mock(PushNotificationPort.class);
        UUID member = UUID.randomUUID();

        new PushTierReachedNotifier(pushes).tierReached(member, Tier.RESERVA);

        verify(pushes).push(new PushRequest(NotificationType.TIER_REACHED, List.of(member), Map.of("tier", "RESERVA"),
                "tier-reached:" + member + ":RESERVA"));
    }
}
