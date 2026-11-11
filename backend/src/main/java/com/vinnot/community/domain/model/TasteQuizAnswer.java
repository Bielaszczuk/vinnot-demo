package com.vinnot.community.domain.model;

import static com.vinnot.community.domain.model.TasteQuizQuestion.AROMA;
import static com.vinnot.community.domain.model.TasteQuizQuestion.DESSERT;
import static com.vinnot.community.domain.model.TasteQuizQuestion.DINNER;
import static com.vinnot.community.domain.model.TasteQuizQuestion.FRUIT;
import static com.vinnot.community.domain.model.TasteQuizQuestion.RAINY_DAY;
import static com.vinnot.community.domain.model.TasteTrait.ACIDITY;
import static com.vinnot.community.domain.model.TasteTrait.BODY;
import static com.vinnot.community.domain.model.TasteTrait.SWEETNESS;
import static com.vinnot.community.domain.model.TasteTrait.TANNIN;

import java.util.List;
import java.util.Map;

/**
 * Every taste quiz option (#541) and what it says about a member's taste. Members see the options, never this mapping:
 * each option shifts structure traits (from a neutral 50) and names the aroma families it points to. The table is
 * documented in the community module architecture.
 */
public enum TasteQuizAnswer {
    DARK_CHOCOLATE_COFFEE(RAINY_DAY, Map.of(TANNIN, 20, BODY, 15), "OAK"),
    SPICED_TEA_APPLE_TART(RAINY_DAY, Map.of(ACIDITY, 15), "SPICE", "FRUIT"),

    CITRUS(FRUIT, Map.of(ACIDITY, 20, BODY, -10), "FRUIT"),
    RED_BERRIES(FRUIT, Map.of(BODY, -5, TANNIN, -5), "FRUIT"),
    DARK_BERRIES(FRUIT, Map.of(BODY, 15, TANNIN, 10), "FRUIT"),
    STONE_TROPICAL(FRUIT, Map.of(SWEETNESS, 10, ACIDITY, -5), "FRUIT", "FLORAL"),

    LEMON_TART(DESSERT, Map.of(ACIDITY, 15)),
    CARAMEL_FLAN(DESSERT, Map.of(SWEETNESS, 25), "OAK"),
    BROWNIE(DESSERT, Map.of(TANNIN, 10, BODY, 10), "OAK"),
    FRESH_FRUIT(DESSERT, Map.of(SWEETNESS, -15, ACIDITY, 5), "FRUIT"),

    GRILLED_RED_MEAT(DINNER, Map.of(BODY, 20, TANNIN, 15), "SPICE"),
    LEMON_FISH(DINNER, Map.of(ACIDITY, 10, BODY, -15, TANNIN, -15), "MINERAL"),
    MUSHROOM_PASTA(DINNER, Map.of(BODY, 5), "MINERAL", "HERBAL"),
    SPICY_CURRY(DINNER, Map.of(SWEETNESS, 10, TANNIN, -10), "SPICE"),

    VANILLA_TOAST(AROMA, Map.of(BODY, 5), "OAK"),
    PEPPER_CINNAMON(AROMA, Map.of(), "SPICE"),
    ROSES_VIOLETS(AROMA, Map.of(), "FLORAL"),
    CUT_GRASS(AROMA, Map.of(ACIDITY, 10), "HERBAL");

    private final TasteQuizQuestion question;
    private final Map<TasteTrait, Integer> shifts;
    private final List<String> families;

    TasteQuizAnswer(TasteQuizQuestion question, Map<TasteTrait, Integer> shifts, String... families) {
        this.question = question;
        this.shifts = shifts;
        this.families = List.of(families);
    }

    public TasteQuizQuestion question() {
        return question;
    }

    /** How many points this option moves each structure trait; traits it does not mention stay put. */
    public Map<TasteTrait, Integer> shifts() {
        return shifts;
    }

    /** The aroma families (FRUIT, FLORAL, HERBAL, SPICE, OAK or MINERAL) this option points to. */
    public List<String> families() {
        return families;
    }
}
