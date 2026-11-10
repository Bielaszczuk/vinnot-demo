package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.offset;

/** S13: candidates are scored by taste fit, freshness, proximity and view recency, weighted by type. */
class EngagementCandidateTest {
    private static final UUID ANA = UUID.randomUUID();

    @Test
    void aBetterFitFresherCloserAndRecentlyViewedCandidateScoresHigher() {
        CandidateSignals weak = new CandidateSignals(0.2, Duration.ofDays(200), false, null);
        CandidateSignals strong = new CandidateSignals(0.9, Duration.ofDays(2), true, Duration.ofDays(1));
        assertThat(candidate(NotificationType.TASTE_PICK, strong).score())
                .isGreaterThan(candidate(NotificationType.TASTE_PICK, weak).score());
        assertThat(new CandidateSignals(1, Duration.ZERO, true, Duration.ZERO).strength()).isCloseTo(1.0, offset(1e-9));
        assertThat(new CandidateSignals(-3, Duration.ofDays(-1), false, Duration.ofDays(30)).strength())
                .as("clamped").isEqualTo(CandidateSignals.FRESHNESS_WEIGHT);
        assertThat(CandidateSignals.fit(5).strength()).isEqualTo(CandidateSignals.FIT_WEIGHT);
    }

    @Test
    void timeBoundTypesOutrankEvergreenSuggestionsAtTheSameStrength() {
        CandidateSignals same = CandidateSignals.fit(0.5);
        assertThat(candidate(NotificationType.POST_EVENT, same).score()).isGreaterThan(candidate(NotificationType.TASTE_PICK, same).score());
        assertThat(candidate(NotificationType.ONBOARDING, CandidateSignals.fit(1)).score())
                .isEqualTo(EngagementRules.of(NotificationType.ONBOARDING).weight() * (0.5 + 0.5 * CandidateSignals.FIT_WEIGHT));
    }

    @Test
    void everyEngagementTypeHasRulesAndOthersAreRefused() {
        Arrays.stream(NotificationType.values()).filter(NotificationType::engagement)
                .forEach(type -> assertThat(EngagementRules.of(type).weight()).as(type.name()).isBetween(0.0, 1.0));
        assertThat(EngagementRules.of(NotificationType.TASTE_PICK).cadence()).isEqualTo(Duration.ofDays(7));
        assertThat(EngagementRules.of(NotificationType.ROUTE_PICK).cadence()).isEqualTo(Duration.ofDays(14));
        assertThat(EngagementRules.of(NotificationType.WINERY_PICK).cadence()).isEqualTo(Duration.ofDays(14));
        assertThat(EngagementRules.of(NotificationType.CELLAR_CHECKIN).cadence()).isEqualTo(Duration.ofDays(30));
        assertThatThrownBy(() -> EngagementRules.of(NotificationType.EVENT_REMINDER)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> candidate(NotificationType.REVIEW_COMMENT, CandidateSignals.fit(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new EngagementCandidate(ANA, NotificationType.WINBACK, null, null, CandidateSignals.fit(1)).data()).isEmpty();
    }

    @Test
    void decisionsCarryACandidateOnlyWhenPlanned() {
        EngagementCandidate chosen = candidate(NotificationType.TASTE_PICK, CandidateSignals.fit(1));
        assertThat(new EngagementDecision(EngagementDecision.Outcome.PLANNED, chosen, null).chosen()).contains(chosen);
        assertThat(EngagementDecision.none(EngagementDecision.Outcome.NO_CANDIDATE).chosen()).isEmpty();
        assertThatThrownBy(() -> new EngagementDecision(EngagementDecision.Outcome.PLANNED, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementDecision(EngagementDecision.Outcome.PAUSED, chosen, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new EngagementSend(NotificationType.TASTE_PICK, "k", null, Instant.EPOCH, true, false).delivered()).isFalse();
    }

    private static EngagementCandidate candidate(NotificationType type, CandidateSignals signals) {
        return new EngagementCandidate(ANA, type, "WINE:1", Map.of("wineId", "1"), signals);
    }
}
