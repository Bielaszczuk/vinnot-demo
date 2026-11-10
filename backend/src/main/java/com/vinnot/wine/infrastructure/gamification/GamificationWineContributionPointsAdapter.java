package com.vinnot.wine.infrastructure.gamification;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** An approved submission is keyed by itself; an exact scan by wine, so each wine earns its scan point once. */
@Component
@RequiredArgsConstructor
public class GamificationWineContributionPointsAdapter implements WineContributionPointsPort {
    private final AwardPointsUseCase points;

    @Override
    public void submissionApproved(UUID submitterId, UUID submissionId, UUID wineId) {
        points.award(new AwardPointsCommand(submitterId, PointSource.WINE_APPROVED, submissionId.toString(),
                PointSubject.wine(wineId)));
    }

    @Override
    public void labelMatched(UUID userId, UUID wineId) {
        points.award(new AwardPointsCommand(userId, PointSource.SCAN_MATCH, wineId.toString(), PointSubject.wine(wineId)));
    }
}
