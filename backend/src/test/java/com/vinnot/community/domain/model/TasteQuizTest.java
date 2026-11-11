package com.vinnot.community.domain.model;

import com.vinnot.community.domain.exception.InvalidTasteQuizException;
import com.vinnot.community.domain.model.TasteTraits.FamilyShare;
import com.vinnot.community.domain.model.TasteTraits.StructureScore;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #541 S10: the taste quiz answers and the internal seed they give the taste traits. */
class TasteQuizTest {

    @Test
    void aQuizNeedsExactlyTheFiveQuestionsEachAnsweredWithOneOfItsOwnOptions() {
        assertInvalid(null);
        Map<String, String> missing = rich();
        missing.remove("AROMA");
        assertInvalid(missing);
        Map<String, String> unknownKey = rich();
        unknownKey.put("BREAKFAST", "CITRUS");
        assertInvalid(unknownKey);
        Map<String, String> unknownValue = rich();
        unknownValue.put("FRUIT", "BANANA");
        assertInvalid(unknownValue);
        Map<String, String> otherQuestion = rich();
        otherQuestion.put("FRUIT", "BROWNIE");
        assertInvalid(otherQuestion);
        Map<String, String> nullValue = rich();
        nullValue.put("DINNER", null);
        assertInvalid(nullValue);
    }

    @Test
    void theAnswersComeBackByQuestionInTheQuizOrder() {
        Map<String, String> shuffled = new HashMap<>(rich());
        assertThat(new ArrayList<>(TasteQuiz.of(shuffled).answers().entrySet()).stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue()).toList())
                .containsExactly("RAINY_DAY=DARK_CHOCOLATE_COFFEE", "FRUIT=DARK_BERRIES", "DESSERT=BROWNIE",
                        "DINNER=GRILLED_RED_MEAT", "AROMA=VANILLA_TOAST");
    }

    @Test
    void structureStartsAtFiftyMovesWithEachAnswerAndIsClampedToOneHundred() {
        // body 50+15+15+10+20+5 = 115 and tannin 50+20+10+10+15 = 105 are clamped; nothing moves acidity or sweetness
        assertThat(TasteQuiz.of(rich()).seed().structure()).containsExactly(
                new StructureScore(TasteTrait.ACIDITY, 50, 0), new StructureScore(TasteTrait.BODY, 100, 0),
                new StructureScore(TasteTrait.TANNIN, 100, 0), new StructureScore(TasteTrait.SWEETNESS, 50, 0));
        // acidity 50+15+20+5+10+10 = 110, body 50-10-15, tannin 50-15, sweetness 50-15
        assertThat(TasteQuiz.of(fresh()).seed().structure()).containsExactly(
                new StructureScore(TasteTrait.ACIDITY, 100, 0), new StructureScore(TasteTrait.BODY, 25, 0),
                new StructureScore(TasteTrait.TANNIN, 35, 0), new StructureScore(TasteTrait.SWEETNESS, 35, 0));
    }

    @Test
    void familiesAreWeightedMentionsWhereTheAromaAnswerWeighsTwoSortedByShareThenKey() {
        // OAK 1+1+2, FRUIT 1, SPICE 1 of 6: 67, 17, 17 with the tie broken by key
        assertThat(TasteQuiz.of(rich()).seed().families()).containsExactly(new FamilyShare("OAK", 67),
                new FamilyShare("FRUIT", 17), new FamilyShare("SPICE", 17));
        // FRUIT 1+1+1, HERBAL 2, MINERAL 1, SPICE 1 of 7: 43, 29, 14, 14
        assertThat(TasteQuiz.of(fresh()).seed().families()).containsExactly(new FamilyShare("FRUIT", 43),
                new FamilyShare("HERBAL", 29), new FamilyShare("MINERAL", 14), new FamilyShare("SPICE", 14));
    }

    @Test
    void everyCombinationSeedsAllFourTraitsInsideTheScaleAndSomeFamily() {
        int combinations = 0;
        for (TasteQuizAnswer rainy : TasteQuizQuestion.RAINY_DAY.options()) {
            for (TasteQuizAnswer fruit : TasteQuizQuestion.FRUIT.options()) {
                for (TasteQuizAnswer dessert : TasteQuizQuestion.DESSERT.options()) {
                    for (TasteQuizAnswer dinner : TasteQuizQuestion.DINNER.options()) {
                        for (TasteQuizAnswer aroma : TasteQuizQuestion.AROMA.options()) {
                            TasteTraits seed = TasteQuiz.of(Map.of("RAINY_DAY", rainy.name(), "FRUIT", fruit.name(),
                                    "DESSERT", dessert.name(), "DINNER", dinner.name(), "AROMA", aroma.name())).seed();
                            assertThat(seed.structure()).hasSize(4).allSatisfy(score ->
                                    assertThat(score.score()).isBetween(0, 100));
                            assertThat(seed.families()).isNotEmpty().allSatisfy(share ->
                                    assertThat(share.percent()).isBetween(1, 100));
                            combinations++;
                        }
                    }
                }
            }
        }
        assertThat(combinations).isEqualTo(2 * 4 * 4 * 4 * 4);
    }

    @Test
    void everyOptionBelongsToExactlyOneQuestion() {
        List<TasteQuizAnswer> options = new ArrayList<>();
        for (TasteQuizQuestion question : TasteQuizQuestion.values()) {
            options.addAll(question.options());
            question.options().forEach(option -> assertThat(option.question()).isEqualTo(question));
        }
        assertThat(options).containsExactlyInAnyOrder(TasteQuizAnswer.values());
        assertThat(TasteQuizQuestion.AROMA.familyWeight()).isEqualTo(2);
        assertThat(TasteQuizQuestion.DINNER.familyWeight()).isEqualTo(1);
    }

    private static void assertInvalid(Map<String, String> answers) {
        assertThatThrownBy(() -> TasteQuiz.of(answers)).isInstanceOf(InvalidTasteQuizException.class)
                .extracting("code").isEqualTo("INVALID_TASTE_QUIZ");
    }

    /** Full-bodied, tannic and oaky. */
    static Map<String, String> rich() {
        Map<String, String> answers = new LinkedHashMap<>();
        answers.put("RAINY_DAY", "DARK_CHOCOLATE_COFFEE");
        answers.put("FRUIT", "DARK_BERRIES");
        answers.put("DESSERT", "BROWNIE");
        answers.put("DINNER", "GRILLED_RED_MEAT");
        answers.put("AROMA", "VANILLA_TOAST");
        return answers;
    }

    /** Crisp, light and herbal. */
    static Map<String, String> fresh() {
        Map<String, String> answers = new LinkedHashMap<>();
        answers.put("RAINY_DAY", "SPICED_TEA_APPLE_TART");
        answers.put("FRUIT", "CITRUS");
        answers.put("DESSERT", "FRESH_FRUIT");
        answers.put("DINNER", "LEMON_FISH");
        answers.put("AROMA", "CUT_GRASS");
        return answers;
    }
}
