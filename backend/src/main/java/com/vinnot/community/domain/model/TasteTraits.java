package com.vinnot.community.domain.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalDouble;

/**
 * What a member's liked wines say about their taste (#541): how acid, full-bodied, tannic and sweet they are, and
 * which aroma families they share. Every liked wine weighs its rating.
 */
public final class TasteTraits {
    /** The lowest rating that counts as a liked wine. */
    public static final BigDecimal MIN_LIKED_RATING = new BigDecimal("3.5");
    /** The most recent liked wines the traits read. */
    public static final int MAX_LIKED_WINES = 200;
    /** Wines with data a structure trait or the families need before they are shown. */
    public static final int MIN_WINES = 3;
    /** The top of the structure scale and of a family share. */
    private static final double MAX_SCORE = 100;

    private final List<StructureScore> structure;
    private final List<FamilyShare> families;

    private TasteTraits(List<StructureScore> structure, List<FamilyShare> families) {
        this.structure = List.copyOf(structure);
        this.families = List.copyOf(families);
    }

    /**
     * Reads the liked wines; wines rated below {@link #MIN_LIKED_RATING} count for nothing. A wine's trait score is
     * the catalog's when it holds a valid one, else its AI profile's; a trait with fewer than {@link #MIN_WINES} wines
     * with a score is left out. Families read only AI-profiled wines and are empty below {@link #MIN_WINES} of them; a
     * family whose share rounds to 0 is left out, and the rest go from the most shared (ties: by key).
     */
    public static TasteTraits of(List<LikedWine> wines) {
        List<LikedWine> liked = wines.stream().filter(wine -> wine.rating().compareTo(MIN_LIKED_RATING) >= 0).toList();
        return new TasteTraits(structure(liked), families(liked));
    }

    private static List<StructureScore> structure(List<LikedWine> liked) {
        List<StructureScore> scores = new ArrayList<>();
        for (TasteTrait trait : TasteTrait.values()) {
            double weighted = 0;
            double weights = 0;
            int wines = 0;
            for (LikedWine wine : liked) {
                OptionalDouble score = score(wine, trait);
                if (score.isPresent()) {
                    double weight = wine.rating().doubleValue();
                    weighted += weight * score.getAsDouble();
                    weights += weight;
                    wines++;
                }
            }
            if (wines >= MIN_WINES) {
                scores.add(new StructureScore(trait, (int) Math.round(weighted / weights), wines));
            }
        }
        return scores;
    }

    private static OptionalDouble score(LikedWine wine, TasteTrait trait) {
        Double catalog = wine.catalogScores().get(trait);
        if (isValid(catalog)) {
            return OptionalDouble.of(catalog);
        }
        Double profile = wine.profileScores().get(trait);
        return isValid(profile) ? OptionalDouble.of(profile) : OptionalDouble.empty();
    }

    private static boolean isValid(Double score) {
        return Objects.nonNull(score) && Double.isFinite(score) && score >= 0 && score <= MAX_SCORE;
    }

    private static List<FamilyShare> families(List<LikedWine> liked) {
        List<LikedWine> profiled = liked.stream().filter(LikedWine::profiled).toList();
        double weights = profiled.stream().mapToDouble(wine -> wine.rating().doubleValue()).sum();
        if (profiled.size() < MIN_WINES) {
            return List.of();
        }
        Map<String, Double> byFamily = new HashMap<>();
        for (LikedWine wine : profiled) {
            wine.families().forEach(family -> byFamily.merge(family, wine.rating().doubleValue(), Double::sum));
        }
        return byFamily.entrySet().stream()
                .map(entry -> new FamilyShare(entry.getKey(), (int) Math.round(MAX_SCORE * entry.getValue() / weights)))
                .filter(share -> share.percent() > 0)
                .sorted(Comparator.comparingInt(FamilyShare::percent).reversed().thenComparing(FamilyShare::family))
                .toList();
    }

    /** Traits built elsewhere, such as the taste quiz seed; structure in trait order, families most shared first. */
    public static TasteTraits from(List<StructureScore> structure, List<FamilyShare> families) {
        return new TasteTraits(structure, families);
    }

    /** {@link #blend(TasteTraits, TasteTraits, Map)} without manual values. */
    public static Optional<Blend> blend(TasteTraits real, TasteTraits seed) {
        return blend(real, seed, Map.of());
    }

    /**
     * The taste traits a profile shows (#541 S10 and S11). For each structure trait a manual value wins, then the real
     * score, then the taste quiz seed's; a manual trait keeps the real wine count, or 0 without real data. Families
     * keep the real list unless it is empty, then take the seed's. Manual values never touch the families.
     *
     * @param real   the traits of the liked wines, or {@code null} under the threshold
     * @param seed   the traits the completed taste quiz suggests, or {@code null} without one
     * @param manual the member's manual score per trait, possibly empty
     * @return nothing when there is no real data, seed nor manual value; else the traits and whether any shown value
     *         came from the seed
     */
    public static Optional<Blend> blend(TasteTraits real, TasteTraits seed, Map<TasteTrait, Integer> manual) {
        if (Objects.isNull(real) && Objects.isNull(seed) && manual.isEmpty()) {
            return Optional.empty();
        }
        Map<TasteTrait, StructureScore> realScores = byTrait(real);
        Map<TasteTrait, StructureScore> seedScores = byTrait(seed);
        List<StructureScore> structure = new ArrayList<>();
        boolean fromQuiz = false;
        for (TasteTrait trait : TasteTrait.values()) {
            StructureScore realScore = realScores.get(trait);
            if (manual.containsKey(trait)) {
                int wines = Objects.isNull(realScore) ? 0 : realScore.wines();
                structure.add(new StructureScore(trait, manual.get(trait), wines, true));
            } else if (Objects.nonNull(realScore)) {
                structure.add(realScore);
            } else if (seedScores.containsKey(trait)) {
                structure.add(seedScores.get(trait));
                fromQuiz = true;
            }
        }
        List<FamilyShare> families = Objects.isNull(real) ? List.of() : real.families;
        if (families.isEmpty() && Objects.nonNull(seed) && !seed.families.isEmpty()) {
            families = seed.families;
            fromQuiz = true;
        }
        return Optional.of(new Blend(new TasteTraits(structure, families), fromQuiz));
    }

    private static Map<TasteTrait, StructureScore> byTrait(TasteTraits traits) {
        Map<TasteTrait, StructureScore> byTrait = new EnumMap<>(TasteTrait.class);
        if (Objects.nonNull(traits)) {
            traits.structure.forEach(score -> byTrait.put(score.trait(), score));
        }
        return byTrait;
    }

    public List<StructureScore> structure() {
        return structure;
    }

    public List<FamilyShare> families() {
        return families;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof TasteTraits traits && structure.equals(traits.structure)
                && families.equals(traits.families);
    }

    @Override
    public int hashCode() {
        return Objects.hash(structure, families);
    }

    /**
     * @param score    the rating-weighted average, 0 to 100, or the member's manual value
     * @param wines    the liked wines with a score for the trait
     * @param adjusted whether the score is the member's manual value (#541 S11)
     */
    public record StructureScore(TasteTrait trait, int score, int wines, boolean adjusted) {
        /** A computed score: from the liked wines or the taste quiz seed. */
        public StructureScore(TasteTrait trait, int score, int wines) {
            this(trait, score, wines, false);
        }
    }

    /** @param percent the rating-weighted share of profiled liked wines with a note of the family, 1 to 100 */
    public record FamilyShare(String family, int percent) { }

    /**
     * @param traits   the traits to show
     * @param fromQuiz whether any shown structure score or the families came from the taste quiz seed
     */
    public record Blend(TasteTraits traits, boolean fromQuiz) { }
}
