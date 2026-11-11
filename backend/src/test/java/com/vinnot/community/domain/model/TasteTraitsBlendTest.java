package com.vinnot.community.domain.model;

import com.vinnot.community.domain.model.TasteTraits.Blend;
import com.vinnot.community.domain.model.TasteTraits.FamilyShare;
import com.vinnot.community.domain.model.TasteTraits.StructureScore;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #541 S10 and S11: a manual value wins for its trait, then the real taste traits; the quiz seed fills what neither
 * shows yet.
 */
class TasteTraitsBlendTest {
    private final TasteTraits seed = TasteQuiz.of(TasteQuizTest.rich()).seed();

    @Test
    void withoutRealTraitsNorAQuizThereIsNothingToShow() {
        assertThat(TasteTraits.blend(null, null)).isEmpty();
    }

    @Test
    void withoutAQuizTheRealTraitsStandAlone() {
        TasteTraits real = TasteTraits.from(List.of(new StructureScore(TasteTrait.BODY, 70, 4)), List.of());
        assertThat(TasteTraits.blend(real, null)).contains(new Blend(real, false));
    }

    @Test
    void underTheThresholdTheQuizSeedIsShown() {
        assertThat(TasteTraits.blend(null, seed)).contains(new Blend(seed, true));
    }

    @Test
    void eachRealTraitWinsAndAMissingTraitComesFromTheQuiz() {
        TasteTraits real = TasteTraits.from(List.of(new StructureScore(TasteTrait.ACIDITY, 64, 3)),
                List.of(new FamilyShare("FLORAL", 80)));
        Optional<Blend> blend = TasteTraits.blend(real, seed);
        assertThat(blend).isPresent();
        assertThat(blend.get().fromQuiz()).isTrue();
        assertThat(blend.get().traits().structure()).containsExactly(
                new StructureScore(TasteTrait.ACIDITY, 64, 3), new StructureScore(TasteTrait.BODY, 100, 0),
                new StructureScore(TasteTrait.TANNIN, 100, 0), new StructureScore(TasteTrait.SWEETNESS, 50, 0));
        assertThat(blend.get().traits().families()).containsExactly(new FamilyShare("FLORAL", 80));
    }

    @Test
    void emptyRealFamiliesFallBackToTheQuizFamilies() {
        List<StructureScore> full = List.of(new StructureScore(TasteTrait.ACIDITY, 10, 3),
                new StructureScore(TasteTrait.BODY, 20, 3), new StructureScore(TasteTrait.TANNIN, 30, 3),
                new StructureScore(TasteTrait.SWEETNESS, 40, 3));
        Blend blend = TasteTraits.blend(TasteTraits.from(full, List.of()), seed).orElseThrow();
        assertThat(blend.fromQuiz()).isTrue();
        assertThat(blend.traits().structure()).isEqualTo(full);
        assertThat(blend.traits().families()).isEqualTo(seed.families());
    }

    @Test
    void completeRealTraitsTakeNothingFromTheQuiz() {
        TasteTraits real = TasteTraits.from(List.of(new StructureScore(TasteTrait.ACIDITY, 10, 3),
                new StructureScore(TasteTrait.BODY, 20, 3), new StructureScore(TasteTrait.TANNIN, 30, 3),
                new StructureScore(TasteTrait.SWEETNESS, 40, 3)), List.of(new FamilyShare("MINERAL", 50)));
        Blend blend = TasteTraits.blend(real, seed).orElseThrow();
        assertThat(blend.fromQuiz()).isFalse();
        assertThat(blend.traits().structure()).isEqualTo(real.structure());
        assertThat(blend.traits().families()).isEqualTo(real.families());
    }

    @Test
    void withoutAdjustmentsTheBlendIsTheSameAsBefore() {
        TasteTraits real = TasteTraits.from(List.of(new StructureScore(TasteTrait.ACIDITY, 64, 3)), List.of());
        assertThat(TasteTraits.blend(real, seed, Map.of())).isEqualTo(TasteTraits.blend(real, seed));
        assertThat(TasteTraits.blend(real, seed, Map.of()).orElseThrow().traits())
                .hasSameHashCodeAs(TasteTraits.blend(real, seed).orElseThrow().traits())
                .isNotEqualTo(real);
        assertThat(TasteTraits.blend(null, null, Map.of())).isEmpty();
        assertThat(TasteTraits.blend(real, seed).orElseThrow().traits().structure())
                .noneMatch(StructureScore::adjusted);
    }

    @Test
    void aManualValueBeatsTheRealScoreAndKeepsItsWineCount() {
        TasteTraits real = TasteTraits.from(List.of(new StructureScore(TasteTrait.ACIDITY, 64, 3)),
                List.of(new FamilyShare("FLORAL", 80)));
        Blend blend = TasteTraits.blend(real, null, Map.of(TasteTrait.ACIDITY, 20)).orElseThrow();
        assertThat(blend.traits().structure()).containsExactly(new StructureScore(TasteTrait.ACIDITY, 20, 3, true));
        assertThat(blend.traits().families()).containsExactly(new FamilyShare("FLORAL", 80));
        assertThat(blend.fromQuiz()).isFalse();
    }

    @Test
    void aManualValueBeatsTheQuizScore() {
        Blend blend = TasteTraits.blend(null, seed, Map.of(TasteTrait.BODY, 40)).orElseThrow();
        assertThat(blend.traits().structure()).containsExactly(new StructureScore(TasteTrait.ACIDITY, 50, 0),
                new StructureScore(TasteTrait.BODY, 40, 0, true), new StructureScore(TasteTrait.TANNIN, 100, 0),
                new StructureScore(TasteTrait.SWEETNESS, 50, 0));
        assertThat(blend.traits().families()).isEqualTo(seed.families());
        assertThat(blend.fromQuiz()).isTrue();
    }

    @Test
    void anAdjustedTraitWithoutRealOrQuizDataAppearsInTraitOrder() {
        TasteTraits real = TasteTraits.from(List.of(new StructureScore(TasteTrait.TANNIN, 64, 3)), List.of());
        Map<TasteTrait, Integer> manual = new EnumMap<>(TasteTrait.class);
        manual.put(TasteTrait.SWEETNESS, 70);
        manual.put(TasteTrait.ACIDITY, 10);
        Blend blend = TasteTraits.blend(real, null, manual).orElseThrow();
        assertThat(blend.traits().structure()).containsExactly(new StructureScore(TasteTrait.ACIDITY, 10, 0, true),
                new StructureScore(TasteTrait.TANNIN, 64, 3), new StructureScore(TasteTrait.SWEETNESS, 70, 0, true));
        assertThat(blend.fromQuiz()).isFalse();
    }

    @Test
    void overridingEveryQuizFilledTraitNoLongerCountsAsFromTheQuiz() {
        TasteTraits real = TasteTraits.from(List.of(new StructureScore(TasteTrait.ACIDITY, 64, 3)),
                List.of(new FamilyShare("FLORAL", 80)));
        assertThat(TasteTraits.blend(real, seed, Map.of(TasteTrait.BODY, 40)).orElseThrow().fromQuiz()).isTrue();
        Blend blend = TasteTraits.blend(real, seed,
                Map.of(TasteTrait.BODY, 40, TasteTrait.TANNIN, 60, TasteTrait.SWEETNESS, 10)).orElseThrow();
        assertThat(blend.fromQuiz()).isFalse();
        assertThat(blend.traits().families()).containsExactly(new FamilyShare("FLORAL", 80));
    }

    @Test
    void adjustmentsAloneShowTheirTraitsWithoutFamilies() {
        Blend blend = TasteTraits.blend(null, null, Map.of(TasteTrait.SWEETNESS, 70)).orElseThrow();
        assertThat(blend.traits().structure()).containsExactly(new StructureScore(TasteTrait.SWEETNESS, 70, 0, true));
        assertThat(blend.traits().families()).isEmpty();
        assertThat(blend.fromQuiz()).isFalse();
    }
}
