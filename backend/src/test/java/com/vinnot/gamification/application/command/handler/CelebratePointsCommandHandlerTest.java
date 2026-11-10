package com.vinnot.gamification.application.command.handler;

import com.vinnot.gamification.application.InMemoryPointsLedger;
import com.vinnot.gamification.application.command.model.CelebratePointsCommand;
import com.vinnot.gamification.domain.model.PointsAccount;
import com.vinnot.gamification.domain.model.Tier;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S5 celebrations: a seen tier and the welcome card stop being pending, and nothing else changes. */
class CelebratePointsCommandHandlerTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    private final InMemoryPointsLedger ledger = new InMemoryPointsLedger();
    private final CelebratePointsCommandHandler handler = new CelebratePointsCommandHandler(ledger);
    private UUID member;

    @BeforeEach
    void setUp() {
        member = ledger.member(BUENOS_AIRES);
        ledger.saveAccount(new PointsAccount(member, BUENOS_AIRES, 300, Tier.LAGAR, Tier.PARRA, false));
    }

    @Test
    void celebratingTheReachedTierClearsThePendingCelebration() {
        handler.execute(new CelebratePointsCommand(member, Tier.LAGAR, false));

        PointsAccount account = ledger.accounts.get(member);
        assertThat(account.highestCelebrated()).isEqualTo(Tier.LAGAR);
        assertThat(account.pendingCelebration()).isNull();
        assertThat(account.welcomeSeen()).isFalse();
        assertThat(account.points()).isEqualTo(300);
    }

    @Test
    void celebratingALowerTierLeavesTheHigherOnePending() {
        handler.execute(new CelebratePointsCommand(member, Tier.RACIMO, false));

        assertThat(ledger.accounts.get(member).highestCelebrated()).isEqualTo(Tier.RACIMO);
        assertThat(ledger.accounts.get(member).pendingCelebration()).isEqualTo(Tier.LAGAR);
    }

    @Test
    void aTierAboveTheReachedOneCountsAsTheReachedOne() {
        handler.execute(new CelebratePointsCommand(member, Tier.VINNOT, false));

        assertThat(ledger.accounts.get(member).highestCelebrated()).isEqualTo(Tier.LAGAR);
    }

    @Test
    void dismissingTheWelcomeCardKeepsTheCelebrationPending() {
        handler.execute(new CelebratePointsCommand(member, null, true));

        PointsAccount account = ledger.accounts.get(member);
        assertThat(account.welcomeSeen()).isTrue();
        assertThat(account.pendingCelebration()).isEqualTo(Tier.LAGAR);
    }

    @Test
    void anUnknownMemberIsRejected() {
        UUID stranger = UUID.randomUUID();

        assertThatThrownBy(() -> handler.execute(new CelebratePointsCommand(stranger, Tier.BROTE, false)))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
