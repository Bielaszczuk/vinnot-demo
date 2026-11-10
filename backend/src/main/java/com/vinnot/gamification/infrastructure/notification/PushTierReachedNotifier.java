package com.vinnot.gamification.infrastructure.notification;

import com.vinnot.gamification.application.port.out.TierReachedNotifier;
import com.vinnot.gamification.domain.model.Tier;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Queues the {@link NotificationType#TIER_REACHED} push in the award's transaction (durable outbox). The key names the
 * member and the tier, so each tier is pushed at most once; the community preference is checked at delivery.
 */
@Component
@RequiredArgsConstructor
public class PushTierReachedNotifier implements TierReachedNotifier {
    private final PushNotificationPort pushes;

    @Override
    public void tierReached(UUID userId, Tier tier) {
        pushes.push(new PushRequest(NotificationType.TIER_REACHED, List.of(userId), Map.of("tier", tier.name()),
                "tier-reached:" + userId + ":" + tier.name()));
    }
}
