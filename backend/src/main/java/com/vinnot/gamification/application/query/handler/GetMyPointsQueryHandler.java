package com.vinnot.gamification.application.query.handler;

import com.vinnot.gamification.application.port.in.GetMyPointsUseCase;
import com.vinnot.gamification.application.port.out.PointsLedgerPort;
import com.vinnot.gamification.application.query.response.PointsSummaryResponse;
import com.vinnot.gamification.domain.model.DailyEarnings;
import com.vinnot.gamification.domain.model.PointRules;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointsAccount;
import com.vinnot.gamification.domain.model.Tier;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Objects;
import java.util.UUID;

/** The member's own points page: seal, progress to the next tier, today's earnings and the last 20 movements. */
@Service
public class GetMyPointsQueryHandler implements GetMyPointsUseCase {
    static final int RECENT_LIMIT = 20;

    private final PointsLedgerPort ledger;
    private final Clock clock;

    @Autowired
    public GetMyPointsQueryHandler(PointsLedgerPort ledger) {
        this(ledger, Clock.systemUTC());
    }

    GetMyPointsQueryHandler(PointsLedgerPort ledger, Clock clock) {
        this.ledger = ledger;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public PointsSummaryResponse execute(UUID userId) {
        PointsAccount account = ledger.findAccount(userId)
                .orElseThrow(() -> new EntityNotFoundException("User", userId));
        Tier tier = account.tier();
        Tier next = tier.next();
        // Any source works for the global figure: the daily cap total does not depend on it.
        DailyEarnings today = ledger.earnedSince(userId, PointSource.REVIEW, account.dayStart(clock.instant()));
        Tier pending = account.pendingCelebration();
        return new PointsSummaryResponse(
                account.points(),
                tier.name(),
                Objects.isNull(next) ? null : next.name(),
                Objects.isNull(next) ? null : next.threshold(),
                tier.threshold(),
                today.withinCap(),
                PointRules.DAILY_CAP,
                Objects.isNull(pending) ? null : pending.name(),
                !account.welcomeSeen(),
                ledger.recentMovements(userId, RECENT_LIMIT).stream()
                        .map(movement -> new PointsSummaryResponse.Entry(movement.id(), movement.source().name(),
                                movement.points(), movement.createdAt(), movement.label()))
                        .toList());
    }
}
