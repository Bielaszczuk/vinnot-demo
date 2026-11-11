package com.vinnot.community.domain.model;

import com.vinnot.community.domain.exception.InvalidTasteAdjustmentException;

import java.math.BigInteger;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * A member's manual change to the structure bars of their own palate (#541 S11). It is partial: each trait it names
 * either gets a whole score from 0 to 100 or, with no score, goes back to its computed value; traits it leaves out
 * stay as they are.
 */
public final class TasteAdjustment {
    /** The lowest manual score. */
    public static final int MIN_SCORE = 0;
    /** The highest manual score. */
    public static final int MAX_SCORE = 100;

    private final Map<TasteTrait, Integer> scores;
    private final Set<TasteTrait> cleared;

    private TasteAdjustment(Map<TasteTrait, Integer> scores, Set<TasteTrait> cleared) {
        this.scores = Collections.unmodifiableMap(scores);
        this.cleared = Collections.unmodifiableSet(cleared);
    }

    /**
     * @param structure trait key to a whole score from 0 to 100, or to {@code null} to clear that trait
     * @throws InvalidTasteAdjustmentException when the structure is missing or empty, names an unknown trait, or holds
     *                                         a score that is not a whole number from 0 to 100; nothing applies then
     */
    public static TasteAdjustment of(Map<?, ?> structure) {
        if (Objects.isNull(structure) || structure.isEmpty()) {
            throw new InvalidTasteAdjustmentException("Name at least one taste trait to adjust");
        }
        Map<TasteTrait, Integer> scores = new EnumMap<>(TasteTrait.class);
        Set<TasteTrait> cleared = EnumSet.noneOf(TasteTrait.class);
        structure.forEach((key, value) -> {
            TasteTrait trait = trait(key);
            if (Objects.isNull(value)) {
                cleared.add(trait);
            } else {
                scores.put(trait, score(value));
            }
        });
        return new TasteAdjustment(scores, cleared);
    }

    private static TasteTrait trait(Object key) {
        for (TasteTrait trait : TasteTrait.values()) {
            if (trait.name().equals(key)) {
                return trait;
            }
        }
        throw new InvalidTasteAdjustmentException("The taste profile has no such trait");
    }

    private static int score(Object value) {
        BigInteger whole = switch (value) {
            case Integer number -> BigInteger.valueOf(number);
            case Long number -> BigInteger.valueOf(number);
            case BigInteger number -> number;
            default -> throw new InvalidTasteAdjustmentException("A taste trait score must be a whole number");
        };
        if (whole.compareTo(BigInteger.valueOf(MIN_SCORE)) < 0 || whole.compareTo(BigInteger.valueOf(MAX_SCORE)) > 0) {
            throw new InvalidTasteAdjustmentException("A taste trait score goes from 0 to 100");
        }
        return whole.intValue();
    }

    /** The traits that get a manual score, in trait order. */
    public Map<TasteTrait, Integer> scores() {
        return scores;
    }

    /** The traits that go back to their computed value, in trait order. */
    public Set<TasteTrait> cleared() {
        return cleared;
    }
}
