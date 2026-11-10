package com.vinnot.gamification.application.command.handler;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.application.port.out.PointsLedgerPort;
import com.vinnot.gamification.application.port.out.TierReachedNotifier;
import com.vinnot.gamification.domain.model.DailyEarnings;
import com.vinnot.gamification.domain.model.PointAward;
import com.vinnot.gamification.domain.model.PointMovement;
import com.vinnot.gamification.domain.model.PointsAccount;
import com.vinnot.gamification.domain.model.Tier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * The single place where points are awarded and revoked (#455). Every change first locks the member's points row,
 * so two awards for one member never lose an update nor exceed a cap; awards and revocations are idempotent per
 * member, source and key. The per-source daily limit applies before the global daily cap.
 */
@Service
public class AwardPointsCommandHandler implements AwardPointsUseCase {
    private final PointsLedgerPort ledger;
    private final TierReachedNotifier notifier;
    private final Clock clock;

    @Autowired
    public AwardPointsCommandHandler(PointsLedgerPort ledger, TierReachedNotifier notifier) {
        this(ledger, notifier, Clock.systemUTC());
    }

    AwardPointsCommandHandler(PointsLedgerPort ledger, TierReachedNotifier notifier, Clock clock) {
        this.ledger = ledger;
        this.notifier = notifier;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void award(AwardPointsCommand command) {
        Optional<PointsAccount> locked = ledger.lockAccount(command.userId());
        if (locked.isEmpty()) {
            return;
        }
        PointsAccount account = locked.get();
        Optional<PointAward> existing = ledger.findAward(command.userId(), command.source(), command.sourceKey());
        if (existing.isPresent() && existing.get().active()) {
            return;
        }
        Instant now = clock.instant();
        DailyEarnings today = ledger.earnedSince(command.userId(), command.source(), account.dayStart(now));
        int granted = command.source().grant(today);
        if (granted == 0) {
            return;
        }
        PointAward award = new PointAward(command.userId(), command.source(), command.sourceKey(), command.subject(),
                granted, true, now);
        ledger.saveAward(award, now);
        ledger.recordMovement(PointMovement.awarded(award, now));
        Optional<Tier> reached = account.add(granted);
        ledger.saveAccount(account);
        reached.ifPresent(tier -> notifier.tierReached(command.userId(), tier));
    }

    @Override
    @Transactional
    public void revoke(RevokePointsCommand command) {
        Optional<PointsAccount> locked = ledger.lockAccount(command.userId());
        if (locked.isEmpty()) {
            return;
        }
        List<PointAward> awards = command.prefix()
                ? ledger.findActiveAwards(command.userId(), command.source(), command.sourceKey())
                : ledger.findAward(command.userId(), command.source(), command.sourceKey())
                        .filter(PointAward::active).stream().toList();
        if (awards.isEmpty()) {
            return;
        }
        PointsAccount account = locked.get();
        Instant now = clock.instant();
        for (PointAward award : awards) {
            ledger.saveAward(award.revoked(), now);
            ledger.recordMovement(PointMovement.revoked(award, now));
            account.remove(award.points());
        }
        ledger.saveAccount(account);
    }
}
