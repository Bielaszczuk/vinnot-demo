package com.vinnot.review.infrastructure.gamification;

import com.vinnot.gamification.application.port.in.GetPointStandingsUseCase;
import com.vinnot.review.application.port.out.ReviewerBadgePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** Reviewer seals from the points module, one read per page. */
@Component("reviewReviewerBadgeAdapter")
@RequiredArgsConstructor
public class GamificationReviewerBadgeAdapter implements ReviewerBadgePort {
    private final GetPointStandingsUseCase standings;

    @Override
    public Map<UUID, String> badgeTiers(Collection<UUID> userIds) {
        return standings.badgeTiers(userIds);
    }
}
