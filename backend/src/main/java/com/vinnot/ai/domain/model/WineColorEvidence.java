package com.vinnot.ai.domain.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * The color cues one wine's catalog facts support: its grapes' pigment, the climate and altitude of its place, its age,
 * and the aging, method or style its name states. The profile prompt hands them to the provider so each color line
 * follows this wine instead of a stock line for its grape. Only catalog facts produce a cue: an unknown place adds no
 * terroir, a missing vintage no age.
 */
public final class WineColorEvidence {

    /** The wine family whose color scale a cue speaks to. */
    public enum Family { RED, WHITE, ROSE }

    /** The catalog facts color depends on; any of them may be missing. */
    public record Facts(String name, String style, String wineType, List<String> grapes, String region,
                        String subregion, String country, Integer vintage, Integer sweetness) {
    }

    private static final int MAX_GRAPES = 4;
    private static final int SWEET_SCORE = 60;
    /** Years at which a color moves to its next stage: young, developing, mature, old. */
    private static final int YOUNG_YEARS = 2;
    private static final int DEVELOPING_YEARS = 5;
    private static final int MATURE_YEARS = 10;
    private static final int FRESH_ROSE_YEARS = 1;
    private static final int FADING_ROSE_YEARS = 3;

    private static final Pattern ROSE_NAME = pattern("rose", "rosado", "rosato", "blush", "pink");
    private static final Pattern BLANC_DE_BLANCS = pattern("blanc de blancs");
    private static final Pattern BLANC_DE_NOIRS = pattern("blanc de noirs?", "blanc de noir");
    private static final Pattern TRADITIONAL = pattern("metodo tradicional", "methode traditionnelle", "champenoise",
            "traditional method", "cremant", "franciacorta", "cap classique", "trento doc", "cava", "champagne");
    private static final Pattern TANK = pattern("prosecco", "charmat", "metodo charmat", "asti", "moscato d asti");
    private static final Pattern ANCESTRAL = pattern("pet nat", "petillant naturel", "ancestral", "ancestrale");
    private static final Pattern GRAN_RESERVA = pattern("gran reserva", "grande reserva");
    private static final Pattern RESERVA = pattern("reserva");
    private static final Pattern CRIANZA = pattern("crianza");
    private static final Pattern NO_OAK = pattern("sin madera", "sin roble", "sin barrica", "unoaked", "no oak",
            "stainless steel", "acero inoxidable");
    private static final Pattern OAK = pattern("roble", "oak", "oaked", "barrica", "barricas", "barrique", "barrel",
            "barrels", "fut de chene", "elevage en fut", "aged in oak");
    private static final Pattern YOUNG = pattern("nouveau", "primeur", "novello", "maceracion carbonica",
            "carbonic", "carbonic maceration", "joven");
    private static final Pattern DRIED = pattern("amarone", "recioto", "appassimento", "ripasso", "passito");
    private static final Pattern LATE_HARVEST = pattern("late harvest", "cosecha tardia", "tardio", "tardia",
            "vendanges tardives", "selection de grains nobles", "auslese", "beerenauslese", "trockenbeerenauslese",
            "eiswein", "ice wine", "icewine", "noble rot", "podredumbre noble", "botrytis", "botrytized", "botrytised", "aszu", "tokaji",
            "vin santo", "straw wine", "vin de paille", "moelleux", "liquoroso", "dulce natural");
    private static final Pattern ORANGE = pattern("orange", "orange wine", "naranjo", "vino naranja", "skin contact",
            "maceracion pelicular", "macerado", "brisat", "brisado", "ramato", "qvevri", "kvevri");
    private static final Pattern SAIGNEE = pattern("saignee", "sangrado", "clarete", "sangria");
    private static final Pattern PALE_ROSE = pattern("gris", "vin gris", "gris de", "blush");
    private static final Pattern PORT = pattern("port", "porto", "oporto");
    private static final Pattern TAWNY = pattern("tawny", "colheita", "10 years?", "20 years?", "30 years?",
            "40 years?", "10 anos", "20 anos", "30 anos", "40 anos");
    private static final Pattern VINTAGE_PORT = pattern("lbv", "late bottled vintage", "vintage port", "vintage");
    private static final Pattern WHITE_PORT = pattern("white", "branco", "blanco", "blanc");
    private static final Pattern SHERRY = pattern("sherry", "jerez", "xeres", "montilla", "manzanilla", "fino",
            "amontillado", "oloroso", "palo cortado", "cream", "pedro ximenez", "px");
    private static final Pattern FINO = pattern("fino", "manzanilla");
    private static final Pattern AMONTILLADO = pattern("amontillado");
    private static final Pattern OLOROSO = pattern("oloroso", "palo cortado");
    private static final Pattern SWEET_SHERRY = pattern("pedro ximenez", "px", "cream");
    private static final Pattern MADEIRA = pattern("madeira", "sercial", "verdelho", "bual", "boal", "malmsey");

    private WineColorEvidence() {
    }

    /** The cues in prompt order: grapes, place, age, then what the name or style states. */
    public static List<String> cues(Facts facts, int currentYear) {
        List<GrapeColor> grapes = grapes(facts.grapes());
        String text = WineGrowingArea.place(join(facts.name(), facts.style()));
        String type = Objects.nonNull(facts.wineType()) ? facts.wineType().toLowerCase(Locale.ROOT) : "";
        Family family = family(type, grapes, text);
        Optional<WineGrowingArea> area = WineGrowingArea.locate(facts.subregion(), facts.region(), facts.country());

        List<String> cues = new ArrayList<>();
        grapes.forEach(grape -> cues.add("Grape: " + (family == Family.ROSE ? grape.roseCue() : grape.cue())));
        if (grapes.stream().filter(grape -> grape.pigment().red()).count() > 1) {
            cues.add("Blend: the color mixes these grapes; even a small share of a deeply pigmented one darkens it");
        }
        area.ifPresent(place -> cues.add("Place: " + place.cue(family)));
        age(facts.vintage(), currentYear, family).ifPresent(cues::add);
        cues.addAll(winemaking(text, type, family, WineGrowingArea.place(facts.country()), area));
        if (family == Family.WHITE && Objects.nonNull(facts.sweetness()) && facts.sweetness() >= SWEET_SCORE) {
            cues.add("Sweetness " + facts.sweetness() + "/100 in the catalog: residual sugar from riper or late-picked "
                    + "grapes goes with a deeper gold");
        }
        return List.copyOf(cues);
    }

    private static List<GrapeColor> grapes(List<String> names) {
        if (Objects.isNull(names)) {
            return List.of();
        }
        return names.stream().map(GrapeColor::of).flatMap(Optional::stream).distinct().limit(MAX_GRAPES).toList();
    }

    /** Rosé by type or name; sparkling, dessert and fortified wines take red when every known grape is red. */
    private static Family family(String type, List<GrapeColor> grapes, String text) {
        if ("rose".equals(type) || (!"red".equals(type) && !"white".equals(type) && ROSE_NAME.matcher(text).find())) {
            return Family.ROSE;
        }
        if ("red".equals(type)) {
            return Family.RED;
        }
        boolean allRed = !grapes.isEmpty() && grapes.stream().allMatch(grape -> grape.pigment().red());
        boolean whiteWine = "white".equals(type) || BLANC_DE_NOIRS.matcher(text).find()
                || WHITE_PORT.matcher(text).find();
        return allRed && !whiteWine ? Family.RED : Family.WHITE;
    }

    private static Optional<String> age(Integer vintage, int currentYear, Family family) {
        if (Objects.isNull(vintage) || vintage > currentYear) {
            return Optional.empty();
        }
        int years = currentYear - vintage;
        String old = years == 0 ? "this year's release" : "about " + years + (years == 1 ? " year" : " years") + " old";
        return Optional.of("Age: vintage " + vintage + ", " + old + "; " + stage(years, family));
    }

    private static String stage(int years, Family family) {
        return switch (family) {
            case RED -> years <= YOUNG_YEARS ? "purple and violet still lead"
                    : years <= DEVELOPING_YEARS ? "violet giving way to ruby, the rim starting to lighten"
                    : years <= MATURE_YEARS ? "ruby moving to garnet, the rim garnet or brick-tinged"
                    : "garnet to brick or tawny, a lighter core and an orange rim";
            case WHITE -> years <= YOUNG_YEARS ? "pale, with green or lemon tints"
                    : years <= DEVELOPING_YEARS ? "straw to light gold"
                    : years <= MATURE_YEARS ? "gold"
                    : "deep gold or old gold, moving toward topaz, amber or brown";
            case ROSE -> years <= FRESH_ROSE_YEARS ? "a fresh, vivid pink"
                    : years <= FADING_ROSE_YEARS ? "pink fading toward salmon or copper"
                    : "copper to onion skin or orange";
        };
    }

    /** Oak deepens each family its own way: a white toward gold, a rosé toward copper, a red toward garnet. */
    private static String oakCue(Family family) {
        return switch (family) {
            case WHITE -> "Style: the name states oak aging, which deepens a white toward gold";
            case ROSE -> "Style: the name states oak aging, which warms a rosé toward copper or salmon";
            case RED -> "Style: the name states oak aging, which turns the violet to ruby and garnet sooner";
        };
    }

    /** A wine released young keeps the fresh look of its family; only a red is violet-purple. */
    private static String youngCue(Family family) {
        return switch (family) {
            case WHITE -> "Style: released young (joven), a pale, bright hue with green or lemon glints";
            case ROSE -> "Style: released young (joven), a fresh, bright pink";
            case RED -> "Style: released young (nouveau, carbonic or joven), a bright violet-purple and a light, "
                    + "lively hue";
        };
    }

    private static List<String> winemaking(String text, String type, Family family, String country,
                                           Optional<WineGrowingArea> area) {
        List<String> cues = new ArrayList<>();
        agingTerms(text, family, country).ifPresent(cues::add);
        if (NO_OAK.matcher(text).find()) {
            cues.add("Style: the name states no oak, so the hue stays fresher and paler");
        } else if (OAK.matcher(text).find()) {
            cues.add(oakCue(family));
        }
        if (YOUNG.matcher(text).find()) {
            cues.add(youngCue(family));
        }
        if (DRIED.matcher(text).find()) {
            cues.add("Style: dried-grape wine (amarone, recioto, ripasso or passito), deep and concentrated");
        }
        if (LATE_HARVEST.matcher(text).find() || "dessert".equals(type)) {
            cues.add(family == Family.WHITE
                    ? "Style: late-harvest or sweet: very ripe, dried or botrytised grapes and residual sugar give a "
                            + "deeper gold, topaz or amber"
                    : "Style: late-harvest or sweet, from very ripe or dried grapes, deep and concentrated");
        }
        if (family == Family.WHITE && !"fortified".equals(type) && ORANGE.matcher(text).find()) {
            cues.add("Style: skin-contact white (orange wine): amber, orange or copper, possibly slightly hazy");
        }
        if (family == Family.ROSE) {
            if (SAIGNEE.matcher(text).find()) {
                cues.add("Style: bled (saignée) or longer skin contact, a deeper pink toward clarete");
            } else if (PALE_ROSE.matcher(text).find()) {
                cues.add("Style: a gris or blush rosé, pressed straight away, very pale");
            }
        }
        if ("sparkling".equals(type)) {
            cues.addAll(sparkling(text, area));
        }
        if ("fortified".equals(type) || "dessert".equals(type)) {
            fortified(text, area).ifPresent(cues::add);
        }
        return cues;
    }

    /** Aging terms only where the law defines them: Spain (Rioja minimums) and Argentina (INV resolutions). */
    private static Optional<String> agingTerms(String text, Family family, String country) {
        boolean red = family == Family.RED;
        if ("espana".equals(country) || "spain".equals(country)) {
            if (GRAN_RESERVA.matcher(text).find()) {
                return Optional.of(red
                        ? "Aging: Gran Reserva (in Rioja at least 5 years, 2 in oak), an evolved garnet with a brick rim"
                        : "Aging: Gran Reserva (in Rioja at least 4 years, 6 months in oak), a deeper gold");
            }
            if (RESERVA.matcher(text).find()) {
                return Optional.of(red
                        ? "Aging: Reserva (in Rioja at least 3 years, 1 in oak), ruby moving to garnet at the rim"
                        : "Aging: Reserva (in Rioja at least 2 years, 6 months in oak), straw to gold");
            }
            if (CRIANZA.matcher(text).find()) {
                return Optional.of(red
                        ? "Aging: Crianza (in Rioja at least 2 years, 1 in oak), ruby with garnet tints at the rim"
                        : "Aging: Crianza (at least 6 months in oak), straw with golden tints");
            }
        }
        if ("argentina".equals(country)) {
            if (GRAN_RESERVA.matcher(text).find()) {
                return Optional.of("Aging: Gran Reserva (Argentine rule: at least 18 months of aging for reds, 12 for "
                        + "whites), less violet and a more evolved hue than a young release");
            }
            if (RESERVA.matcher(text).find()) {
                return Optional.of("Aging: Reserva (Argentine rule: at least 12 months of aging for reds, 6 for "
                        + "whites), a touch more evolved than a young release");
            }
        }
        return Optional.empty();
    }

    private static List<String> sparkling(String text, Optional<WineGrowingArea> area) {
        List<String> cues = new ArrayList<>();
        if (BLANC_DE_BLANCS.matcher(text).find()) {
            cues.add("Style: Blanc de Blancs, white grapes only, pale lemon with green glints");
        }
        if (BLANC_DE_NOIRS.matcher(text).find()) {
            cues.add("Style: Blanc de Noirs, a white from red grapes that may keep a faint copper or pink tinge");
        }
        boolean traditionalArea = area.filter(place -> place == WineGrowingArea.CHAMPAGNE
                || place == WineGrowingArea.CAVA).isPresent();
        if (traditionalArea || TRADITIONAL.matcher(text).find()) {
            cues.add("Style: bottle-fermented sparkling; long aging before and after disgorging brings golden tints");
        } else if (area.filter(place -> place == WineGrowingArea.PROSECCO).isPresent() || TANK.matcher(text).find()) {
            cues.add("Style: tank-method sparkling released young, pale straw to lemon");
        }
        if (ANCESTRAL.matcher(text).find()) {
            cues.add("Style: ancestral-method sparkling (pet-nat), often unfiltered and slightly hazy");
        }
        return cues;
    }

    /** Port, sherry and Madeira styles set the color by how they age (IVDP, sherry.wine). */
    private static Optional<String> fortified(String text, Optional<WineGrowingArea> area) {
        boolean port = PORT.matcher(text).find() || area.filter(place -> place == WineGrowingArea.PORTO
                || place == WineGrowingArea.DOURO).isPresent();
        boolean sherry = area.filter(place -> place == WineGrowingArea.JEREZ).isPresent()
                || SHERRY.matcher(text).find();
        if (port) {
            if (TAWNY.matcher(text).find()) {
                return Optional.of("Style: tawny Port, whose oxidative cask aging turns it tawny and amber-brown with an "
                        + "orange rim");
            }
            if (WHITE_PORT.matcher(text).find()) {
                return Optional.of("Style: white Port, golden, turning amber and brown with long cask aging");
            }
            if (VINTAGE_PORT.matcher(text).find()) {
                return Optional.of("Style: Vintage or LBV Port, very deep and near-opaque purple-black when young");
            }
            return Optional.of("Style: ruby Port, aged to keep a deep, bright red");
        }
        if (sherry) {
            if (SWEET_SHERRY.matcher(text).find()) {
                return Optional.of("Style: Pedro Ximénez or cream sherry, from sun-dried grapes, very dark ebony or "
                        + "mahogany, near-opaque");
            }
            if (OLOROSO.matcher(text).find()) {
                return Optional.of("Style: oloroso or palo cortado, oxidative aging, amber to mahogany");
            }
            if (AMONTILLADO.matcher(text).find()) {
                return Optional.of("Style: amontillado, aged under flor then oxidatively, amber to topaz or light brown");
            }
            if (FINO.matcher(text).find()) {
                return Optional.of("Style: fino or manzanilla, aged under flor, pale straw to lemon");
            }
        }
        if (MADEIRA.matcher(text).find() || area.filter(place -> place == WineGrowingArea.MADEIRA).isPresent()) {
            return Optional.of("Style: Madeira, heated and oxidative aging, amber to mahogany");
        }
        return Optional.empty();
    }

    private static String join(String first, String second) {
        return (Objects.nonNull(first) ? first : "") + " " + (Objects.nonNull(second) ? second : "");
    }

    /** Whole-word, normalized keywords; normalization turns "Rosé" into "rose" and "Côt" into "cot". */
    private static Pattern pattern(String... words) {
        return Pattern.compile("(?<![a-z0-9])(?:" + String.join("|", words) + ")(?![a-z0-9])");
    }
}
