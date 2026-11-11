package com.vinnot.community.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * The taste wheel of a member's public profile (#541 S15), built from every wine they rated. It shows one kind at a
 * time: grapes (the default view), wine types and regions, each with up to {@link #MAX_PER_KIND} slices, best average
 * score first. Only aggregates leave this class, never a wine, so it is safe for members whose cellar is private.
 * <ul>
 *   <li>Grapes written in another script, case or with doubled letters are one slice ({@link GrapeName#matchKey});
 *   a grape listed twice on one wine counts once.</li>
 *   <li>A grape's label is its most frequent Latin-script spelling, else its title-cased romanisation; its value is
 *   the label's {@link GrapeName#normalize key}.</li>
 *   <li>A type's tone is its own code; a grape's tone is the most frequent type among the rated wines that contain it,
 *   a tie going to the type matching the grape's catalog colour (RED or WHITE) and else to the first type code.</li>
 * </ul>
 */
public final class TasteWheel {
    /** Slices each view shows at most. */
    public static final int MAX_PER_KIND = 8;
    private static final int SCORE_SCALE = 2;
    private static final Comparator<Entry> BEST_FIRST = Comparator.comparing(Entry::score, Comparator.reverseOrder())
            .thenComparing(Entry::ratedWines, Comparator.reverseOrder()).thenComparing(Entry::label)
            .thenComparing(Entry::value);

    private TasteWheel() {
    }

    public enum Kind {
        GRAPE,
        TYPE,
        REGION
    }

    /**
     * One rated wine: the member's rating and the wine's facts.
     *
     * @param rating     the member's rating, 0 to 5
     * @param type       the wine type code as stored
     * @param grapes     the wine's grapes as written
     * @param regionId   the region id, or {@code null}
     * @param regionName the region name, or {@code null}
     */
    public record RatedWine(BigDecimal rating, String type, List<String> grapes, String regionId, String regionName) {
        public RatedWine {
            Objects.requireNonNull(rating, "rating");
            grapes = Objects.isNull(grapes) ? List.of() : List.copyOf(grapes);
        }
    }

    /** A grape of the catalog: its English and Spanish names and its colour (RED, WHITE, OTHER or {@code null}). */
    public record CatalogGrape(String name, String nameEs, String category) { }

    /**
     * One slice.
     *
     * @param kind       the view it belongs to
     * @param value      the grape key, the type code or the region id
     * @param label      the text to show
     * @param score      the average rating of its wines, two decimals
     * @param tone       a type code that colours the slice; {@code null} for regions
     * @param ratedWines how many rated wines it comes from
     */
    public record Entry(Kind kind, String value, String label, BigDecimal score, String tone, int ratedWines) { }

    /** The slices of every view: grapes, then types, then regions. */
    public static List<Entry> of(List<RatedWine> wines, List<CatalogGrape> catalog) {
        Map<String, String> colours = colours(catalog);
        return Stream.of(grapes(wines, colours), types(wines), regions(wines))
                .flatMap(entries -> entries.stream().sorted(BEST_FIRST).limit(MAX_PER_KIND)).toList();
    }

    private static List<Entry> types(List<RatedWine> wines) {
        return group(wines.stream().filter(wine -> !type(wine).isEmpty()).toList(), TasteWheel::type).entrySet()
                .stream().map(group -> entry(Kind.TYPE, group.getKey(), group.getKey(), group.getValue(),
                        group.getKey())).toList();
    }

    private static List<Entry> regions(List<RatedWine> wines) {
        List<RatedWine> located = wines.stream().filter(wine -> Objects.nonNull(wine.regionId())).toList();
        return group(located, RatedWine::regionId).values().stream()
                .map(group -> entry(Kind.REGION, group.getFirst().regionId(),
                        Objects.requireNonNullElse(group.getFirst().regionName(), ""), group, null))
                .toList();
    }

    private static List<Entry> grapes(List<RatedWine> wines, Map<String, String> colours) {
        Map<String, List<RatedWine>> byGrape = new LinkedHashMap<>();
        Map<String, List<String>> spellings = new LinkedHashMap<>();
        for (RatedWine wine : wines) {
            Set<String> seen = new LinkedHashSet<>();
            for (String spelling : wine.grapes()) {
                String trimmed = spelling.strip();
                String key = GrapeName.matchKey(trimmed);
                if (!key.isEmpty() && seen.add(key)) {
                    byGrape.computeIfAbsent(key, ignored -> new ArrayList<>()).add(wine);
                    spellings.computeIfAbsent(key, ignored -> new ArrayList<>()).add(trimmed);
                }
            }
        }
        return byGrape.entrySet().stream().map(group -> {
            String label = label(spellings.get(group.getKey()));
            return entry(Kind.GRAPE, GrapeName.normalize(label), label, group.getValue(),
                    tone(group.getValue(), colours.get(group.getKey())));
        }).toList();
    }

    /** The most frequent Latin-script spelling (ties: the first in text order), else the title-cased key. */
    private static String label(List<String> spellings) {
        Comparator<Map.Entry<String, Long>> mostFrequent = Map.Entry.<String, Long>comparingByValue().reversed()
                .thenComparing(Map.Entry.comparingByKey());
        Map<String, Long> latin = spellings.stream().filter(GrapeName::isLatinScript)
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        if (!latin.isEmpty()) {
            return latin.entrySet().stream().sorted(mostFrequent).findFirst().orElseThrow().getKey();
        }
        Map<String, Long> keys = spellings.stream().map(GrapeName::normalize)
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        return GrapeName.titleCase(keys.entrySet().stream().sorted(mostFrequent).findFirst().orElseThrow().getKey());
    }

    /** The most frequent type of the grape's wines; a tie goes to the catalog colour, else to the first code. */
    private static String tone(List<RatedWine> wines, String colour) {
        Map<String, Long> counts = wines.stream().map(TasteWheel::type).filter(type -> !type.isEmpty())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        long top = counts.values().stream().mapToLong(Long::longValue).max().orElse(0);
        List<String> tied = counts.entrySet().stream().filter(count -> count.getValue() == top).map(Map.Entry::getKey)
                .sorted().toList();
        if (tied.isEmpty()) {
            return null;
        }
        return tied.contains(colour) ? colour : tied.getFirst();
    }

    /** The catalog colour of each grape by match key, from its English and Spanish names; the first name wins. */
    private static Map<String, String> colours(List<CatalogGrape> catalog) {
        Map<String, String> colours = new LinkedHashMap<>();
        for (CatalogGrape grape : catalog) {
            if (Objects.isNull(grape.category())) {
                continue;
            }
            String colour = grape.category().strip().toUpperCase(Locale.ROOT);
            Stream.of(grape.name(), grape.nameEs()).filter(Objects::nonNull).map(GrapeName::matchKey)
                    .filter(key -> !key.isEmpty()).forEach(key -> colours.putIfAbsent(key, colour));
        }
        return colours;
    }

    private static Map<String, List<RatedWine>> group(List<RatedWine> wines, Function<RatedWine, String> key) {
        return wines.stream().collect(Collectors.groupingBy(key, LinkedHashMap::new, Collectors.toList()));
    }

    private static Entry entry(Kind kind, String value, String label, List<RatedWine> wines, String tone) {
        BigDecimal total = wines.stream().map(RatedWine::rating).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal score = total.divide(BigDecimal.valueOf(wines.size()), SCORE_SCALE, RoundingMode.HALF_UP);
        return new Entry(kind, value, label, score, tone, wines.size());
    }

    /** The type code as the taste table stores it: trimmed and in upper case. */
    private static String type(RatedWine wine) {
        return Objects.isNull(wine.type()) ? "" : wine.type().strip().toUpperCase(Locale.ROOT);
    }
}
