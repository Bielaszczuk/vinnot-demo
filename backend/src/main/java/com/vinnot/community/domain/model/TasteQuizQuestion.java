package com.vinnot.community.domain.model;

import java.util.Arrays;
import java.util.List;

/**
 * The five taste quiz questions (#541), in the order members answer them. The aroma question names the notes a member
 * likes most directly, so its families weigh twice as much as the other answers' families.
 */
public enum TasteQuizQuestion {
    RAINY_DAY(1),
    FRUIT(1),
    DESSERT(1),
    DINNER(1),
    AROMA(2);

    private final int familyWeight;

    TasteQuizQuestion(int familyWeight) {
        this.familyWeight = familyWeight;
    }

    /** The weight each family named by this question's answer adds to the seed. */
    public int familyWeight() {
        return familyWeight;
    }

    /** The options members can pick for this question. */
    public List<TasteQuizAnswer> options() {
        return Arrays.stream(TasteQuizAnswer.values()).filter(answer -> answer.question() == this).toList();
    }
}
