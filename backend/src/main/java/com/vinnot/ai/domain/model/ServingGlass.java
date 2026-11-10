package com.vinnot.ai.domain.model;

import java.util.Arrays;
import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The illustrated glass a serving recommendation names. A glassware line names a wine family (red, white, rosé,
 * sparkling, fortified) and often a shape ("cáliz amplio", "abertura estrecha", "tulipa", "Bordeaux"); the family
 * the line names first and the shape it names first pick the glass. A line that names no family takes it from the
 * wine's color. A line that asks for a universal tasting glass shows that glass.
 */
public enum ServingGlass {
    FLUTE,
    SPARKLING_TULIP,
    RED_BALLOON,
    BORDEAUX,
    WHITE_TULIP,
    WHITE_BOWL,
    ROSE,
    DESSERT,
    UNIVERSAL;

    private enum Family {
        SPARKLING("espum*", "sparkling", "champa(gne|n)", "cava", "efervesc*", "effervesc*", "burbuj*", "bubbl*",
                "flautas?", "flutes?"),
        FORTIFIED("fortif*", "oporto", "port", "jerez", "sherry", "postres?", "dessert", "licoros[oa]s?", "madeira",
                "marsala"),
        ROSE("rosad[oa]s?", "rose"),
        WHITE("blanc[oa]s?", "whites?", "chardonnay", "riesling", "sauvignon", "torrontes"),
        RED("tint[oa]s?", "reds?", "pinot noir", "cabernet", "malbec", "nebbiolo", "bordeaux", "bordeles*", "burdeos",
                "borgona", "burgundy");

        private final Pattern words;

        Family(String... keywords) {
            this.words = TastingText.keywords(keywords);
        }

        static Optional<Family> namedFirstIn(String text) {
            return Arrays.stream(values())
                    .filter(family -> firstAt(family.words, text) >= 0)
                    .min(Comparator.comparingInt(family -> firstAt(family.words, text)));
        }

        static Optional<Family> of(WineColorTone tone) {
            if (Objects.isNull(tone)) {
                return Optional.empty();
            }
            Family family = switch (tone) {
                case RED_PURPLE, RED_RUBY_LIGHT, RED_CHERRY, RED_RUBY, RED_RUBY_DEEP, RED_GARNET, RED_TAWNY, RED_INKY,
                        RED_VIOLET_BRIGHT, RED_PLUM, RED_BRICK -> RED;
                case ROSE_PALE, ROSE_SALMON, ROSE_RASPBERRY, ROSE_RASPBERRY_LIGHT, ROSE_COPPER, ROSE_CORAL, ROSE_PEACH,
                        ROSE_DEEP -> ROSE;
                case MAHOGANY, WHITE_BROWN -> FORTIFIED;
                case WHITE_GREEN, WHITE_LEMON, WHITE_STRAW, WHITE_GOLD, WHITE_OLD_GOLD, AMBER, WHITE_WATER, WHITE_STEEL,
                        WHITE_TOPAZ, ORANGE, AMBER_DARK -> WHITE;
            };
            return Optional.of(family);
        }
    }

    private static final Pattern UNIVERSAL_WORDS = TastingText.keywords("universal(es)?", "iso", "inao", "de cata",
            "tasting glass(es)?", "all-purpose", "multiuso");
    private static final Pattern BROAD = TastingText.keywords("ampli[oa]s?", "broad*", "wide*", "large*", "grandes?",
            "gran", "generous", "generos[oa]s?", "spacious", "espacios[oa]s?", "anch[oa]s?", "balon(es)?", "balloon",
            "borgona", "burgundy", "chardonnay", "pinot noir");
    private static final Pattern SLENDER = TastingText.keywords("estrech[oa]s?", "narrow*", "taper*", "cerrad[oa]s?",
            "tulip*", "tall*", "alt[oa]s?", "bordeaux", "bordeles*", "burdeos");
    private static final Pattern TULIP = TastingText.keywords("tulip*");
    private static final Pattern FLUTE_WORDS = TastingText.keywords("flautas?", "flutes?");

    /** The glass for a glassware line alone, without the wine's color to fall back on. */
    public static Optional<ServingGlass> fromGlassware(String glassware) {
        return of(glassware, null);
    }

    /** The glass for a glassware line; when the line names no wine family, the wine's color gives it. */
    public static Optional<ServingGlass> of(String glassware, WineColorTone color) {
        String text = Objects.isNull(glassware) ? "" : TastingText.normalized(glassware);
        if (UNIVERSAL_WORDS.matcher(text).find()) {
            return Optional.of(UNIVERSAL);
        }
        return Family.namedFirstIn(text).or(() -> Family.of(color)).map(family -> glassFor(family, text));
    }

    private static ServingGlass glassFor(Family family, String text) {
        boolean broad = namesBroadFirst(text);
        return switch (family) {
            case SPARKLING -> sparkling(text, broad);
            case FORTIFIED -> DESSERT;
            case ROSE -> ROSE;
            case WHITE -> broad ? WHITE_BOWL : WHITE_TULIP;
            case RED -> firstAt(SLENDER, text) >= 0 && !broad ? BORDEAUX : RED_BALLOON;
        };
    }

    /** A sparkling tulip when the line asks for one (even while warning against a flute), else the flute. */
    private static ServingGlass sparkling(String text, boolean broad) {
        if (TULIP.matcher(text).find()) {
            return SPARKLING_TULIP;
        }
        return broad && !FLUTE_WORDS.matcher(text).find() ? SPARKLING_TULIP : FLUTE;
    }

    /** Whether the line names a broad bowl before (or without) a slender one. */
    private static boolean namesBroadFirst(String text) {
        int broad = firstAt(BROAD, text);
        int slender = firstAt(SLENDER, text);
        return broad >= 0 && (slender < 0 || broad < slender);
    }

    private static int firstAt(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.start() : -1;
    }
}
