package com.vinnot.community.domain.model;

import com.vinnot.community.domain.model.TasteScore.Kind;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** #541 S7: who sees a cellar, the taste wheel after five rated wines, the affinity percentage and public names. */
class SocialRulesTest {

    @Test
    void aPublicCellarIsVisibleToEveryoneAFollowersCellarOnlyToFollowersAndAPrivateOneOnlyToItsOwner() {
        assertThat(CellarVisibility.PUBLIC.visibleTo(false, false)).isTrue();
        assertThat(CellarVisibility.FOLLOWERS.visibleTo(false, false)).isFalse();
        assertThat(CellarVisibility.FOLLOWERS.visibleTo(false, true)).isTrue();
        assertThat(CellarVisibility.PRIVATE.visibleTo(false, true)).isFalse();
        for (CellarVisibility visibility : CellarVisibility.values()) {
            assertThat(visibility.visibleTo(true, false)).as(visibility.name()).isTrue();
        }
        assertThat(CellarVisibility.fromStored(null)).isEqualTo(CellarVisibility.PUBLIC);
        assertThat(CellarVisibility.fromStored("FOLLOWERS")).isEqualTo(CellarVisibility.FOLLOWERS);
    }

    @Test
    void ratedWinesAddUpTheTypeRowsAndTheWheelNeedsFive() {
        TasteProfile four = TasteProfile.of(List.of(type("RED", "4.50", 3), type("WHITE", "3.00", 1), grape("malbec", "4.50", 3)));
        assertThat(four.ratedWines()).isEqualTo(4);
        assertThat(four.isShareable()).isFalse();
        TasteProfile five = TasteProfile.of(List.of(type("RED", "4.50", 3), type("WHITE", "3.00", 2)));
        assertThat(five.ratedWines()).isEqualTo(5);
        assertThat(five.isShareable()).isTrue();
    }

    @Test
    void affinityIsTheRoundedCosineOfBothVectorsAndNeedsBothProfilesShareable() {
        TasteProfile ana = TasteProfile.of(List.of(type("RED", "4.00", 5), grape("malbec", "3.00", 5)));
        TasteProfile same = TasteProfile.of(List.of(type("RED", "4.00", 6), grape("malbec", "3.00", 6)));
        TasteProfile disjoint = TasteProfile.of(List.of(type("WHITE", "5.00", 5)));
        TasteProfile partial = TasteProfile.of(List.of(type("RED", "4.00", 5), type("WHITE", "3.00", 1)));
        TasteProfile newcomer = TasteProfile.of(List.of(type("RED", "4.00", 2)));
        assertThat(ana.affinityWith(same)).hasValue(100);
        assertThat(ana.affinityWith(disjoint)).hasValue(0);
        // cos = 16 / (5 * 5) = 0.64
        assertThat(ana.affinityWith(partial)).hasValue(64);
        assertThat(ana.affinityWith(newcomer)).isEmpty();
        assertThat(newcomer.affinityWith(ana)).isEmpty();
        assertThat(TasteProfile.percent(0, 0, 3)).isZero();
        assertThat(TasteProfile.percent(16, 5, 5)).isEqualTo(64);
    }

    @Test
    void thePublicNameIsFirstAndLastNameOrTheUsername() {
        assertThat(PublicName.of("ana", "Ana", "Lopez")).isEqualTo("Ana Lopez");
        assertThat(PublicName.of("ana", " ", "Lopez")).isEqualTo("Lopez");
        assertThat(PublicName.of("ana", "", null)).isEqualTo("ana");
    }

    private static TasteScore type(String value, String score, int rated) {
        return new TasteScore(Kind.TYPE, value, value, new BigDecimal(score), rated);
    }

    private static TasteScore grape(String value, String score, int rated) {
        return new TasteScore(Kind.GRAPE, value, value, new BigDecimal(score), rated);
    }
}
