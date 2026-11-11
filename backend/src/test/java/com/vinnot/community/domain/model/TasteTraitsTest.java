package com.vinnot.community.domain.model;

import com.vinnot.community.domain.model.TasteTraits.FamilyShare;
import com.vinnot.community.domain.model.TasteTraits.StructureScore;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** #541 S9: structure and aroma families of the wines a member liked. */
class TasteTraitsTest {

    @Test
    void structureIsTheRatingWeightedAverageOfTheWinesWithData() {
        TasteTraits traits = TasteTraits.of(List.of(
                wine("5", Map.of(TasteTrait.ACIDITY, 80d), Map.of(), false, Set.of()),
                wine("4", Map.of(), Map.of(TasteTrait.ACIDITY, 50d), true, Set.of()),
                wine("4.5", Map.of(), Map.of(TasteTrait.ACIDITY, 60d), true, Set.of())));
        // (5*80 + 4*50 + 4.5*60) / 13.5 = 64.4
        assertThat(traits.structure()).containsExactly(new StructureScore(TasteTrait.ACIDITY, 64, 3));
    }

    @Test
    void aTraitWithFewerThanThreeWinesWithDataIsOmittedAndTraitsKeepTheirOrder() {
        TasteTraits traits = TasteTraits.of(List.of(
                wine("4", Map.of(TasteTrait.SWEETNESS, 10d, TasteTrait.BODY, 70d), Map.of(), false, Set.of()),
                wine("4", Map.of(TasteTrait.SWEETNESS, 20d, TasteTrait.BODY, 90d), Map.of(), false, Set.of()),
                wine("4", Map.of(TasteTrait.SWEETNESS, 30d), Map.of(TasteTrait.TANNIN, 40d), true, Set.of())));
        assertThat(traits.structure()).containsExactly(new StructureScore(TasteTrait.SWEETNESS, 20, 3));
        assertThat(TasteTraits.of(List.of()).structure()).isEmpty();
    }

    @Test
    void theCatalogScoreWinsOverTheAiProfileScoreAndOutOfRangeScoresCountAsMissing() {
        TasteTraits traits = TasteTraits.of(List.of(
                wine("4", Map.of(TasteTrait.TANNIN, 90d), Map.of(TasteTrait.TANNIN, 10d), true, Set.of()),
                wine("4", Map.of(TasteTrait.TANNIN, 90d), Map.of(TasteTrait.TANNIN, 10d), true, Set.of()),
                wine("4", Map.of(TasteTrait.TANNIN, 150d), Map.of(TasteTrait.TANNIN, 30d), true, Set.of()),
                wine("4", Map.of(TasteTrait.TANNIN, -1d), Map.of(TasteTrait.TANNIN, Double.NaN), true, Set.of())));
        assertThat(traits.structure()).containsExactly(new StructureScore(TasteTrait.TANNIN, 70, 3));
    }

    @Test
    void winesBelowTheLikedRatingCountForNothing() {
        TasteTraits traits = TasteTraits.of(List.of(
                wine("3.5", Map.of(TasteTrait.BODY, 50d), Map.of(), true, Set.of("OAK")),
                wine("3.5", Map.of(TasteTrait.BODY, 50d), Map.of(), true, Set.of("OAK")),
                wine("3.5", Map.of(TasteTrait.BODY, 50d), Map.of(), true, Set.of("OAK")),
                wine("3.4", Map.of(TasteTrait.BODY, 100d), Map.of(), true, Set.of("FRUIT"))));
        assertThat(traits.structure()).containsExactly(new StructureScore(TasteTrait.BODY, 50, 3));
        assertThat(traits.families()).containsExactly(new FamilyShare("OAK", 100));
    }

    @Test
    void familiesAreTheRatingWeightedShareOfProfiledWinesSortedDescendingWithoutZeroes() {
        TasteTraits traits = TasteTraits.of(List.of(
                wine("5", Map.of(), Map.of(), true, Set.of("FRUIT", "OAK")),
                wine("4", Map.of(), Map.of(), true, Set.of("SPICE", "FLORAL")),
                wine("4.5", Map.of(), Map.of(), true, Set.of("FRUIT")),
                wine("5", Map.of(), Map.of(), false, Set.of("MINERAL"))));
        // weights 13.5: FRUIT 9.5 -> 70, OAK 5 -> 37, FLORAL and SPICE 4 -> 30 (ties by key); MINERAL is unprofiled
        assertThat(traits.families()).containsExactly(new FamilyShare("FRUIT", 70), new FamilyShare("OAK", 37),
                new FamilyShare("FLORAL", 30), new FamilyShare("SPICE", 30));
    }

    @Test
    void aFamilyRoundingToZeroIsOmitted() {
        List<LikedWine> wines = new ArrayList<>();
        wines.add(wine("4", Map.of(), Map.of(), true, Set.of("HERBAL")));
        for (int index = 0; index < 200; index++) {
            wines.add(wine("4", Map.of(), Map.of(), true, Set.of("FRUIT")));
        }
        assertThat(TasteTraits.of(wines).families()).containsExactly(new FamilyShare("FRUIT", 100));
    }

    @Test
    void familiesNeedThreeProfiledWines() {
        TasteTraits traits = TasteTraits.of(List.of(
                wine("5", Map.of(), Map.of(), true, Set.of("FRUIT")),
                wine("5", Map.of(), Map.of(), true, Set.of("FRUIT")),
                wine("5", Map.of(), Map.of(), false, Set.of()),
                wine("5", Map.of(), Map.of(), false, Set.of())));
        assertThat(traits.families()).isEmpty();
    }

    private static LikedWine wine(String rating, Map<TasteTrait, Double> catalog, Map<TasteTrait, Double> profile,
            boolean profiled, Set<String> families) {
        return new LikedWine(new BigDecimal(rating), copy(catalog), copy(profile), profiled, families);
    }

    private static Map<TasteTrait, Double> copy(Map<TasteTrait, Double> scores) {
        Map<TasteTrait, Double> copy = new EnumMap<>(TasteTrait.class);
        copy.putAll(scores);
        return copy;
    }
}
