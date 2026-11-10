package com.vinnot.user.infrastructure.gamification;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointRules;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.user.application.port.out.ProfilePointsPort;
import com.vinnot.user.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Awarded once under a single key and never revoked, so clearing and completing the profile again earns nothing. */
@Component
@RequiredArgsConstructor
public class GamificationProfilePointsAdapter implements ProfilePointsPort {
    private final AwardPointsUseCase points;

    @Override
    public void profileChanged(User user) {
        if (PointRules.isCompleteProfile(user.getProfileImageUrl(), user.getFirstName(), user.getLastName(),
                user.getPhoneNumber())) {
            points.award(new AwardPointsCommand(user.getId(), PointSource.PROFILE_COMPLETE, PointRules.PROFILE_KEY, null));
        }
    }
}
