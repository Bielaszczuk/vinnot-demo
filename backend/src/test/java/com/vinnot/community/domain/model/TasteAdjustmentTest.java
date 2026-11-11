package com.vinnot.community.domain.model;

import com.vinnot.community.domain.exception.InvalidTasteAdjustmentException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #541 S11: a member's manual change to their palate names traits with a whole score from 0 to 100 or null. */
class TasteAdjustmentTest {

    @Test
    void aNumberSetsItsTraitANullClearsItAndTraitsLeftOutAreNotPartOfIt() {
        Map<String, Object> structure = new LinkedHashMap<>();
        structure.put("SWEETNESS", 100);
        structure.put("BODY", null);
        structure.put("ACIDITY", 0);
        structure.put("TANNIN", 35L);

        TasteAdjustment adjustment = TasteAdjustment.of(structure);

        assertThat(adjustment.scores()).containsExactly(Map.entry(TasteTrait.ACIDITY, 0),
                Map.entry(TasteTrait.TANNIN, 35), Map.entry(TasteTrait.SWEETNESS, 100));
        assertThat(adjustment.cleared()).containsExactly(TasteTrait.BODY);
        assertThat(TasteAdjustment.of(Map.of("BODY", BigInteger.valueOf(42))).scores())
                .containsExactly(Map.entry(TasteTrait.BODY, 42));
    }

    @Test
    void aMissingOrEmptyStructureIsRejected() {
        assertInvalid(null);
        assertInvalid(Map.of());
    }

    @Test
    void anUnknownTraitIsRejected() {
        assertInvalid(Map.of("FRUIT", 50));
        assertInvalid(Map.of("acidity", 50));
        Map<Object, Object> notText = new HashMap<>();
        notText.put(1, 50);
        assertInvalid(notText);
        Map<Object, Object> nullKey = new HashMap<>();
        nullKey.put(null, 50);
        assertInvalid(nullKey);
    }

    @Test
    void aScoreOutsideZeroToOneHundredIsRejected() {
        assertInvalid(Map.of("ACIDITY", 101));
        assertInvalid(Map.of("ACIDITY", -1));
        assertInvalid(Map.of("ACIDITY", 99_999_999_999L));
        assertInvalid(Map.of("ACIDITY", new BigInteger("99999999999999999999")));
    }

    @Test
    void aScoreThatIsNotAWholeNumberIsRejected() {
        for (Object score : List.of(80.5, 80.0, new BigDecimal("80"), "80", true, List.of(80))) {
            assertInvalid(Map.of("ACIDITY", score));
        }
    }

    @Test
    void oneInvalidTraitRejectsTheWholeAdjustment() {
        assertInvalid(Map.of("ACIDITY", 80, "BODY", 200));
    }

    private static void assertInvalid(Map<?, ?> structure) {
        assertThatThrownBy(() -> TasteAdjustment.of(structure)).isInstanceOf(InvalidTasteAdjustmentException.class)
                .extracting("code").isEqualTo("INVALID_TASTE_ADJUSTMENT");
    }
}
