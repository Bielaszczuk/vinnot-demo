package com.vinnot.gamification.application.query.handler;

import com.vinnot.gamification.application.InMemoryPointsLedger;
import com.vinnot.gamification.application.command.handler.CelebratePointsCommandHandler;
import com.vinnot.gamification.application.command.model.CelebratePointsCommand;
import com.vinnot.gamification.domain.model.PointMovement;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import com.vinnot.gamification.domain.model.PointsAccount;
import com.vinnot.gamification.domain.model.Tier;
import com.vinnot.gamification.application.query.response.PointStanding;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S5: the member's points page, celebrations and the seals shown next to names. */
class PointsQueryHandlersTest {
    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final Instant NOW = Instant.parse("2026-10-27T15:00:00Z");
    private final InMemoryPointsLedger ledger = new InMemoryPointsLedger();
    private final GetMyPointsQueryHandler myPoints = new GetMyPointsQueryHandler(ledger, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void aMemberWithoutPointsIsAFreshBrote() {
        UUID member = ledger.member(ZONE);

        var summary = myPoints.execute(member);

        assertThat(summary.points()).isZero();
        assertThat(summary.tier()).isEqualTo("BROTE");
        assertThat(summary.nextTier()).isEqualTo("PARRA");
        assertThat(summary.nextTierAt()).isEqualTo(30);
        assertThat(summary.tierFloor()).isZero();
        assertThat(summary.todayEarned()).isZero();
        assertThat(summary.dailyCap()).isEqualTo(40);
        assertThat(summary.pendingCelebration()).isNull();
        assertThat(summary.showWelcome()).isFalse();
        assertThat(summary.recent()).isEmpty();
        assertThatThrownBy(() -> myPoints.execute(UUID.randomUUID())).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void theSummaryShowsProgressTodayAndTheLastMovementsLabelled() {
        UUID member = ledger.member(ZONE);
        UUID wine = UUID.randomUUID();
        ledger.labels.put(wine, "Gran Malbec");
        ledger.saveAccount(new PointsAccount(member, ZONE, 5003, Tier.VINNOT, Tier.GRAN_ENOFILO, false));
        ledger.recordMovement(new PointMovement(UUID.randomUUID(), member, PointSource.REVIEW, "w", 3,
                PointSubject.wine(wine), NOW.minusSeconds(60), null));
        ledger.recordMovement(new PointMovement(UUID.randomUUID(), member, PointSource.WINE_APPROVED, "s", 8,
                null, NOW.minusSeconds(30), null));
        ledger.recordMovement(new PointMovement(UUID.randomUUID(), member, PointSource.REVIEW, "w", -3,
                PointSubject.wine(wine), NOW.minusSeconds(10), null));
        for (int old = 0; old < 25; old++) {
            ledger.recordMovement(new PointMovement(UUID.randomUUID(), member, PointSource.COMMENT, "c" + old, 1,
                    null, NOW.minusSeconds(86_400L * 3 + old), null));
        }

        var summary = myPoints.execute(member);

        assertThat(summary.tier()).isEqualTo("VINNOT");
        assertThat(summary.nextTier()).isNull();
        assertThat(summary.nextTierAt()).isNull();
        assertThat(summary.tierFloor()).isEqualTo(5000);
        assertThat(summary.todayEarned()).as("only today's awards within the cap").isEqualTo(3);
        assertThat(summary.pendingCelebration()).isEqualTo("VINNOT");
        assertThat(summary.showWelcome()).isTrue();
        assertThat(summary.recent()).hasSize(20);
        assertThat(summary.recent().getFirst().points()).isEqualTo(-3);
        assertThat(summary.recent().getFirst().label()).isEqualTo("Gran Malbec");
        assertThat(summary.recent().getFirst().source()).isEqualTo("REVIEW");
        assertThat(summary.recent().get(1).label()).isNull();
    }

    @Test
    void celebratingAndDismissingTheWelcomeAreStored() {
        UUID member = ledger.member(ZONE);
        ledger.saveAccount(new PointsAccount(member, ZONE, 90, Tier.RACIMO, Tier.BROTE, false));
        var celebrate = new CelebratePointsCommandHandler(ledger);

        celebrate.execute(new CelebratePointsCommand(member, Tier.PARRA, false));
        assertThat(myPoints.execute(member).pendingCelebration()).isEqualTo("RACIMO");
        assertThat(myPoints.execute(member).showWelcome()).isTrue();

        celebrate.execute(new CelebratePointsCommand(member, null, true));
        celebrate.execute(new CelebratePointsCommand(member, Tier.RACIMO, false));

        assertThat(myPoints.execute(member).pendingCelebration()).isNull();
        assertThat(myPoints.execute(member).showWelcome()).isFalse();
        assertThatThrownBy(() -> celebrate.execute(new CelebratePointsCommand(UUID.randomUUID(), Tier.BROTE, true)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void standingsHideTheSealOfLockedOrInactiveMembers() {
        UUID visible = ledger.member(ZONE);
        UUID hidden = ledger.member(ZONE);
        ledger.hidden.add(hidden);
        ledger.saveAccount(new PointsAccount(visible, ZONE, 450, Tier.BARRICA, Tier.BARRICA, true));
        ledger.saveAccount(new PointsAccount(hidden, ZONE, 450, Tier.BARRICA, Tier.BARRICA, true));
        var standings = new GetPointStandingsQueryHandler(ledger);

        assertThat(standings.standings(List.of(visible, hidden, UUID.randomUUID())))
                .containsOnlyKeys(visible, hidden)
                .containsEntry(visible, new PointStanding(450, "BARRICA"))
                .containsEntry(hidden, new PointStanding(450, null));
        assertThat(standings.badgeTiers(List.of(visible, hidden))).containsOnly(Map.entry(visible, "BARRICA"));
        assertThat(standings.standings(List.of())).isEmpty();
    }
}
