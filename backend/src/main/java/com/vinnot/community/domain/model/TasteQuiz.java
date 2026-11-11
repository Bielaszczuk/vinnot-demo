package com.vinnot.community.domain.model;

import com.vinnot.community.domain.exception.InvalidTasteQuizException;
import com.vinnot.community.domain.model.TasteTraits.FamilyShare;
import com.vinnot.community.domain.model.TasteTraits.StructureScore;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * A member's answers to the five taste quiz questions (#541) and the taste traits they seed. The seed is internal: it
 * is never sent to clients as a mapping, only blended into the profile's taste traits where real data is missing.
 */
public final class TasteQuiz {
    /** Every structure trait starts here before the answers move it. */
    public static final int NEUTRAL_SCORE = 50;
    private static final int MIN_SCORE = 0;
    private static final int MAX_SCORE = 100;
    private static final String INCOMPLETE = "Answer every question of the taste quiz";

    private final Map<TasteQuizQuestion, TasteQuizAnswer> answers;

    private TasteQuiz(Map<TasteQuizQuestion, TasteQuizAnswer> answers) {
        this.answers = Collections.unmodifiableMap(new EnumMap<>(answers));
    }

    /**
     * Reads the answers by question key and option key.
     *
     * @throws InvalidTasteQuizException when a question is missing or unknown, or an option is unknown or belongs to
     *                                   another question
     */
    public static TasteQuiz of(Map<String, String> answers) {
        if (Objects.isNull(answers)) {
            throw new InvalidTasteQuizException(INCOMPLETE);
        }
        Map<TasteQuizQuestion, TasteQuizAnswer> parsed = new EnumMap<>(TasteQuizQuestion.class);
        answers.forEach((key, value) -> {
            TasteQuizQuestion question = parse(TasteQuizQuestion.class, key, "The taste quiz has no such question");
            TasteQuizAnswer answer = parse(TasteQuizAnswer.class, value, "The taste quiz has no such option");
            if (answer.question() != question) {
                throw new InvalidTasteQuizException("The option does not belong to the question");
            }
            parsed.put(question, answer);
        });
        if (parsed.size() != TasteQuizQuestion.values().length) {
            throw new InvalidTasteQuizException(INCOMPLETE);
        }
        return new TasteQuiz(parsed);
    }

    private static <E extends Enum<E>> E parse(Class<E> type, String key, String message) {
        if (Objects.isNull(key)) {
            throw new InvalidTasteQuizException(message);
        }
        try {
            return Enum.valueOf(type, key);
        } catch (IllegalArgumentException unknown) {
            throw new InvalidTasteQuizException(message);
        }
    }

    /** The answer to every question, in quiz order. */
    public Map<TasteQuizQuestion, TasteQuizAnswer> answers() {
        return answers;
    }

    /** The answers as question key to option key, in quiz order. */
    public Map<String, String> keys() {
        Map<String, String> keys = new LinkedHashMap<>();
        answers.forEach((question, answer) -> keys.put(question.name(), answer.name()));
        return keys;
    }

    /**
     * The taste traits the answers suggest. Every structure trait starts at {@link #NEUTRAL_SCORE}, moves with each
     * answer's shifts and is clamped to 0-100; quiz scores come from no wine, so they report 0 wines. Families are
     * weighted mentions: each family an answer names adds its question's weight (the aroma question weighs 2, the
     * rest 1), and a family's share is its weight over the total, rounded; a share of 0 is left out, and the rest go
     * from the most shared (ties: by key).
     */
    public TasteTraits seed() {
        return TasteTraits.from(structure(), families());
    }

    private List<StructureScore> structure() {
        Map<TasteTrait, Integer> scores = new EnumMap<>(TasteTrait.class);
        for (TasteTrait trait : TasteTrait.values()) {
            scores.put(trait, NEUTRAL_SCORE);
        }
        answers.values().forEach(answer -> answer.shifts().forEach((trait, shift) -> scores.merge(trait, shift, Integer::sum)));
        List<StructureScore> structure = new ArrayList<>();
        scores.forEach((trait, score) -> structure.add(new StructureScore(trait, Math.clamp(score, MIN_SCORE, MAX_SCORE), 0)));
        return structure;
    }

    private List<FamilyShare> families() {
        Map<String, Integer> weights = new HashMap<>();
        answers.values().forEach(answer -> answer.families()
                .forEach(family -> weights.merge(family, answer.question().familyWeight(), Integer::sum)));
        double total = weights.values().stream().mapToInt(Integer::intValue).sum();
        return weights.entrySet().stream()
                .map(entry -> new FamilyShare(entry.getKey(), (int) Math.round(MAX_SCORE * entry.getValue() / total)))
                .filter(share -> share.percent() > 0)
                .sorted(Comparator.comparingInt(FamilyShare::percent).reversed().thenComparing(FamilyShare::family))
                .toList();
    }
}
