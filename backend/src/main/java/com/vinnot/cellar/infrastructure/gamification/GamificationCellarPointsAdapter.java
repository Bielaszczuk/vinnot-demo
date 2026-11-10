package com.vinnot.cellar.infrastructure.gamification;

import com.vinnot.cellar.application.port.out.CellarPointsPort;
import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Keyed by wine and never revoked, so removing and adding the same wine again earns nothing more. */
@Component
@RequiredArgsConstructor
public class GamificationCellarPointsAdapter implements CellarPointsPort {
    private final AwardPointsUseCase points;

    @Override
    public void wineAddedByHand(UUID userId, UUID wineId) {
        points.award(new AwardPointsCommand(userId, PointSource.CELLAR_ADD, wineId.toString(), PointSubject.wine(wineId)));
    }
}
