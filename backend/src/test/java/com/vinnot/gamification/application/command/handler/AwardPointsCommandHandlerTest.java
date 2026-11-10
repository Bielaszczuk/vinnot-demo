package com.vinnot.gamification.application.command.handler;

import com.vinnot.gamification.application.InMemoryPointsLedger;
import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.out.TierReachedNotifier;
import com.vinnot.gamification.domain.model.PointMovement;
import com.vinnot.gamification.domain.model.PointRules;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import com.vinnot.gamification.domain.model.Tier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** S2 and S3 through the award use case: idempotency, revocation, daily caps and once-per-tier pushes. */
class AwardPointsCommandHandlerTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    private final InMemoryPointsLedger ledger = new InMemoryPointsLedger();
    private final TierReachedNotifier notifier = mock(TierReachedNotifier.class);
    private Instant now = Instant.parse("2026-10-27T15:00:00Z");
    private AwardPointsCommandHandler handler;
    private UUID member;

    @BeforeEach
    void setUp() {
        handler = new AwardPointsCommandHandler(ledger, notifier, new Clock() {
            @Override
            public ZoneId getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return now;
            }
        });
        member = ledger.member(BUENOS_AIRES);
    }

    @Test
    void anAwardIsIdempotentPerMemberSourceAndKey() {
        UUID wine = UUID.randomUUID();
        AwardPointsCommand review = new AwardPointsCommand(member, PointSource.REVIEW, wine.toString(), PointSubject.wine(wine));

        handler.award(review);
        handler.award(review);

        assertThat(ledger.points(member)).isEqualTo(3);
        assertThat(ledger.movements).extracting(PointMovement::points).containsExactly(3);
        assertThat(ledger.awards).hasSize(1);
    }

    @Test
    void aRevocationTakesBackExactlyWhatWasAwardedOnceAndAllowsAwardingAgain() {
        String wine = UUID.randomUUID().toString();
        handler.award(new AwardPointsCommand(member, PointSource.REVIEW, wine, null));

        handler.revoke(RevokePointsCommand.of(member, PointSource.REVIEW, wine));
        handler.revoke(RevokePointsCommand.of(member, PointSource.REVIEW, wine));
        handler.revoke(RevokePointsCommand.of(member, PointSource.COMMENT, "never-awarded"));

        assertThat(ledger.points(member)).isZero();
        assertThat(ledger.movements).extracting(PointMovement::points).containsExactly(3, -3);

        handler.award(new AwardPointsCommand(member, PointSource.REVIEW, wine, null));
        assertThat(ledger.points(member)).as("delete and create again nets zero").isEqualTo(3);
    }

    @Test
    void aPrefixRevocationTakesBackEveryLikeOfAReview() {
        UUID review = UUID.randomUUID();
        handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, PointRules.likeKey(review, UUID.randomUUID()), null));
        handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, PointRules.likeKey(review, member), null));
        handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, PointRules.likeKey(UUID.randomUUID(), member), null));

        handler.revoke(RevokePointsCommand.everyKeyStartingWith(member, PointSource.LIKE_RECEIVED, PointRules.reviewKeyPrefix(review)));
        handler.revoke(RevokePointsCommand.everyKeyStartingWith(member, PointSource.LIKE_RECEIVED, PointRules.reviewKeyPrefix(review)));

        assertThat(ledger.points(member)).isEqualTo(1);
    }

    @Test
    void likesStopAtFivePerDayAndTheLimitResetsAtTheMembersMidnight() {
        for (int like = 0; like < 7; like++) {
            handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, "like-" + like, null));
        }
        assertThat(ledger.points(member)).isEqualTo(5);
        assertThat(ledger.awards).hasSize(5);

        now = Instant.parse("2026-10-28T02:59:00Z");
        handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, "late", null));
        assertThat(ledger.points(member)).as("still the 27th in Buenos Aires").isEqualTo(5);

        now = Instant.parse("2026-10-28T03:00:00Z");
        handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, "late", null));
        assertThat(ledger.points(member)).isEqualTo(6);
    }

    @Test
    void commentsScansAndCellarAddsStopAtThreePerDay() {
        for (int index = 0; index < 4; index++) {
            handler.award(new AwardPointsCommand(member, PointSource.COMMENT, "comment-" + index, null));
            handler.award(new AwardPointsCommand(member, PointSource.SCAN_MATCH, "scan-" + index, null));
            handler.award(new AwardPointsCommand(member, PointSource.CELLAR_ADD, "cellar-" + index, null));
        }

        assertThat(ledger.points(member)).isEqualTo(9);
    }

    @Test
    void theGlobalCapIsFortyPerDayAndApprovedWinesAreOutsideIt() {
        for (int review = 0; review < 14; review++) {
            handler.award(new AwardPointsCommand(member, PointSource.REVIEW, "wine-" + review, null));
        }
        assertThat(ledger.points(member)).as("13 reviews and a clamped one").isEqualTo(40);
        assertThat(ledger.movements.getLast().points()).isEqualTo(1);

        handler.award(new AwardPointsCommand(member, PointSource.EVENT_REGISTRATION, "registration", null));
        handler.award(new AwardPointsCommand(member, PointSource.WINE_APPROVED, "submission", null));

        assertThat(ledger.points(member)).isEqualTo(48);
        assertThat(ledger.findAward(member, PointSource.EVENT_REGISTRATION, "registration")).isEmpty();
    }

    @Test
    void reachingATierQueuesOnePushAndADropAndReturnDoNotQueueAnother() {
        for (int review = 0; review < 10; review++) {
            handler.award(new AwardPointsCommand(member, PointSource.REVIEW, "wine-" + review, null));
        }
        verify(notifier, times(1)).tierReached(member, Tier.PARRA);

        handler.revoke(RevokePointsCommand.of(member, PointSource.REVIEW, "wine-0"));
        assertThat(ledger.accounts.get(member).tier()).isEqualTo(Tier.BROTE);
        handler.award(new AwardPointsCommand(member, PointSource.REVIEW, "wine-0", null));

        verify(notifier, times(1)).tierReached(any(), any());
        assertThat(ledger.accounts.get(member).pendingCelebration()).isEqualTo(Tier.PARRA);
    }

    @Test
    void aMemberThatNoLongerExistsEarnsAndLosesNothing() {
        UUID gone = UUID.randomUUID();

        handler.award(new AwardPointsCommand(gone, PointSource.REVIEW, "wine", null));
        handler.revoke(RevokePointsCommand.of(gone, PointSource.REVIEW, "wine"));

        assertThat(ledger.movements).isEmpty();
        verifyNoInteractions(notifier);
    }

    @Test
    void aCappedAwardLeavesNoTraceSoItCanBeEarnedAnotherDay() {
        for (int like = 0; like < 5; like++) {
            handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, "like-" + like, null));
        }
        handler.award(new AwardPointsCommand(member, PointSource.LIKE_RECEIVED, "capped", null));
        handler.revoke(RevokePointsCommand.of(member, PointSource.LIKE_RECEIVED, "capped"));

        assertThat(ledger.findAward(member, PointSource.LIKE_RECEIVED, "capped")).isEmpty();
        assertThat(ledger.points(member)).isEqualTo(5);
        verify(notifier, never()).tierReached(any(), any());
    }
}
