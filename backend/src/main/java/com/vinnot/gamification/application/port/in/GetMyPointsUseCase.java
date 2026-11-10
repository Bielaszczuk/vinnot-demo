package com.vinnot.gamification.application.port.in;

import com.vinnot.gamification.application.query.response.PointsSummaryResponse;

import java.util.UUID;

/** The member's own points, seal, progress and recent movements. */
public interface GetMyPointsUseCase {
    PointsSummaryResponse execute(UUID userId);
}
