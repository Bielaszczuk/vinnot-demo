package com.vinnot.community.domain.model;

import com.vinnot.community.domain.model.TasteScore.Kind;

import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.stream.Collectors;

/**
 * A member's taste as other members see it (#541), read from the nightly taste table: whether they rated enough wines
 * to show their wheel (built by {@link TasteWheel}) and how close it is to someone else's taste. Every rated wine has
 * exactly one type, so the type rows add up to the rated wines.
 */
public final class TasteProfile {
    /** Rated wines a member needs before the wheel and the affinity are shown. */
    public static final int MIN_RATED_WINES = 5;
    private final List<TasteScore> scores;

    private TasteProfile(List<TasteScore> scores) {
        this.scores = List.copyOf(scores);
    }

    public static TasteProfile of(List<TasteScore> scores) {
        return new TasteProfile(scores);
    }

    /** The wines the member rated: the sum of the type rows. */
    public int ratedWines() {
        return scores.stream().filter(score -> score.kind() == Kind.TYPE).mapToInt(TasteScore::ratedWines).sum();
    }

    /** Whether the member rated enough wines to show their taste. */
    public boolean isShareable() {
        return ratedWines() >= MIN_RATED_WINES;
    }

    /**
     * The cosine similarity of both profiles over every type and grape, as a rounded percentage; empty unless both
     * profiles are shareable.
     */
    public OptionalInt affinityWith(TasteProfile other) {
        if (!isShareable() || !other.isShareable()) {
            return OptionalInt.empty();
        }
        Map<String, Double> mine = vector();
        Map<String, Double> theirs = other.vector();
        double dot = mine.entrySet().stream()
                .mapToDouble(entry -> entry.getValue() * theirs.getOrDefault(entry.getKey(), 0d)).sum();
        return OptionalInt.of(percent(dot, norm(mine), norm(theirs)));
    }

    /**
     * The rounded percentage of a cosine similarity; profiles without any positive score are 0% alike.
     *
     * @param dot   the dot product of both vectors
     * @param normA the length of the first vector
     * @param normB the length of the second vector
     * @return 0 to 100
     */
    public static int percent(double dot, double normA, double normB) {
        if (normA <= 0 || normB <= 0) {
            return 0;
        }
        double cosine = Math.clamp(dot / (normA * normB), 0d, 1d);
        return (int) Math.round(cosine * 100);
    }

    private Map<String, Double> vector() {
        return scores.stream().collect(Collectors.toMap(TasteScore::dimension,
                score -> score.score().doubleValue(), Double::sum));
    }

    private static double norm(Map<String, Double> vector) {
        return Math.sqrt(vector.values().stream().mapToDouble(value -> value * value).sum());
    }
}
