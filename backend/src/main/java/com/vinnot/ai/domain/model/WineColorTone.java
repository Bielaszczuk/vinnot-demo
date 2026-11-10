package com.vinnot.ai.domain.model;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The glass a profile shows for its visual color line. The tones follow the usual tasting scale and the finer hues
 * that place, age and winemaking bring (almost colorless, steely, lemon-green, lemon, straw, gold, old gold, topaz;
 * orange, amber, dark amber, mahogany; pale, onion-skin, salmon, coral, peach, light and deep raspberry and deep
 * pinks; inky, purple, bright violet, plum, ruby, cherry, garnet, brick, tawny), so a free-text line such as
 * "Rojo rubí profundo con reflejos violáceos" maps to one illustrated glass.
 */
public enum WineColorTone {
    WHITE_GREEN,
    WHITE_LEMON,
    WHITE_STRAW,
    WHITE_GOLD,
    WHITE_OLD_GOLD,
    AMBER,
    MAHOGANY,
    ROSE_PALE,
    ROSE_SALMON,
    ROSE_RASPBERRY,
    ROSE_RASPBERRY_LIGHT,
    RED_PURPLE,
    RED_RUBY_LIGHT,
    RED_CHERRY,
    RED_RUBY,
    RED_RUBY_DEEP,
    RED_GARNET,
    RED_TAWNY,
    /** Almost colorless, watery whites ("casi incoloro", "acuoso"). */
    WHITE_WATER,
    /** Steely or silvery greenish whites ("verdoso acerado", "plateado"). */
    WHITE_STEEL,
    /** Topaz: aged sweet or late-harvest whites between gold and amber ("topacio"). */
    WHITE_TOPAZ,
    /** Skin-contact orange wines ("naranja", "ámbar anaranjado"). */
    ORANGE,
    /** A dark, deep amber short of mahogany ("ámbar oscuro", "ámbar profundo"). */
    AMBER_DARK,
    /** Onion-skin and copper rosés ("piel de cebolla", "rosa cobrizo"). */
    ROSE_COPPER,
    ROSE_CORAL,
    /** Peach and apricot rosés ("durazno", "melocotón", "damasco"). */
    ROSE_PEACH,
    /** Deep rosés and claretes ("rosado intenso", "clarete", "rosa cereza claro"). */
    ROSE_DEEP,
    /** Near-black, inky reds ("negro violáceo", "tinta", "casi negro"). */
    RED_INKY,
    /** A young, bright violet, unlike the dark purple ("violeta brillante"). */
    RED_VIOLET_BRIGHT,
    RED_PLUM,
    /** Brick and orange-tinged old reds ("ladrillo", "teja marcada", "granate anaranjado"). */
    RED_BRICK,
    /** Brown aged whites and generosos (amontillado, oloroso, white tawny Port), lighter than mahogany. */
    WHITE_BROWN;

    /**
     * The main hue comes before the first comma, period, "con"/"with" clause or a verb that moves to the rim
     * ("fades to", "shifts to", "hacia"); the rest are nuances. Leading comma clauses without a hue ("Deep, nearly
     * opaque purple core") stay part of the main hue.
     */
    private static final Pattern MAIN_CLAUSE_END = Pattern.compile("[,.;]| con | with | (?:fades?|fading|shifts?"
            + "|shifting|lightens?|lightening|turns?|turning|toward|towards|hacia|vira|aclara|se aligera) ");
    private static final Pattern MAHOGANY_HUE = Pattern.compile("caoba|marron|ebano|castan|mahogany|brown|ebony|chestnut");
    /** Mahogany and ebony, or a dark brown; a plain or light brown is the brown of aged whites. */
    private static final Pattern MAHOGANY_ITSELF = Pattern.compile("caoba|ebano|mahogany|ebony|oscur|profund|deep|dark"
            + "|\\bintens[oa]\\b|opac|negr");
    /** Words that put a clause on the rim, the reflections or the tears rather than the core. */
    private static final Pattern RIM_OR_GLINT = Pattern.compile("\\b(bordes?|ribetes?|menisco|rims?|edges?|meniscus|orillas?"
            + "|contornos?|franjas?"
            + "|reflejos?|destell\\w*|glints?|reflections?|highlights?|lagrimas?|tears|piernas|legs)\\b");
    /** Clauses a line may open with before it reaches the core ("A la luz, ..., un centro picota ..."). */
    private static final Pattern SEGMENT_BREAK = Pattern.compile("[,.;:]| con | with | que | which | while | mientras "
            + "| hacia | toward | towards | sobre | over | enmarca | rodea | encierra | frames | surrounds | around "
            + "| alrededor de | acompana | accompanies ");
    /** Clauses of the nuances a depth may sit in ("con un centro de intensidad media y un borde más claro"). */
    private static final Pattern DEPTH_CLAUSE_BREAK = Pattern.compile("[,.;:]| con | with | que | which | while "
            + "| mientras | hacia | toward | towards | sobre | over | y | and ");
    /** The bottom of the glass or the light showing through the wine ("deja ver el fondo de la copa"). */
    private static final Pattern SEE_THROUGH = Pattern.compile("deja ver el fondo|se ve el fondo|fondo de la copa"
            + "|bottom of the glass|base of the glass|see through|see the bottom|light passes|deja pasar (?:la )?luz"
            + "|la luz atraviesa|light through|lets light|allows light|permite (?:ver|apreciar) (?:la luz|el fondo)");
    /** Depth words, checked in this order: mixed steps first, then medium, deep and pale. */
    private static final Pattern PALE_MIXED = Pattern.compile("medi[oa][- ]baj[oa]|medium[- ]low|medio a (?:baj|clar)"
            + "|intensidad baja|baja intensidad|low intensity|low-intensity|apenas (?:se )?profundiza|barely deepens");
    private static final Pattern DEEP_MIXED = Pattern.compile("medi[oa][- ]alt[oa]|medium[- ](?:high|deep)"
            + "|medi[oa] a (?:profund|alt|intens)");
    private static final Pattern MEDIUM_DEPTH = Pattern.compile("intensidad media|media intensidad|capa media"
            + "|color marcado|distinctly colou?red|marked colou?r|enough depth|profundidad suficiente"
            + "|suficiente profundidad|ten(?:ir|e) la copa|colou?rs? the glass"
            + "|(?<!capa )(?<!capa es )marcad|pronounced|(?:noticeable|some) depth|(?:cierta|algo de) profundidad|buena presencia"
            + "|tiene presencia|has presence"
            + "|\\bmedi[oa]s?\\b|moderad|medium|moderate");
    /** A defined color without a depth word reads medium, after the deep words had their say ("definido y profundo"). */
    private static final Pattern DEFINED_COLOR = Pattern.compile("definid[oa]|clearly defined|well[- ]defined");
    private static final Pattern DEEP_DEPTH = Pattern.compile("intensidad alta|alta intensidad|high intensity|high-intensity"
            + "|profund|\\bintens[oa]s?\\b|oscur|opac|(?<!cereza )negr"
            + "|(?<!cereza )tinta|entintad|capa (?:es |muy )?alta|capa (?:es )?marcada|mucha capa|impenetrable|cubiert[oa]"
            + "|concentrad|apenas deja ver|apenas se ve|barely (?:lets|shows)|hardly (?:lets|shows)|\\bdens[oa]s?\\b"
            + "|\\bdense\\b|\\bdeep|\\bdark"
            + "|opaque|\\bintense\\b|inky|black(?![ -]?cherr)|concentrated|little light|saturad|saturated|densely"
            + "|intensely|intensamente|\\binked\\b|good depth");
    private static final Pattern PALE_DEPTH = Pattern.compile("palid|\\bclar[oa]s?\\b|liger[oa]|translucid|translucent"
            + "|acuos|tenue|incoloro|transparen|capa baja|baja intensidad|\\bpale\\b|\\blight\\b|faint|watery"
            + "|low intensity|colorless|lightly");
    /** "No deja ver el fondo" is opaque, not a negated hue; read it before negations are dropped. */
    private static final Pattern HIDDEN_BOTTOM = Pattern.compile("\\bno (?:deja ver|se ve|permite ver) el fondo"
            + "|(?:cannot|can't|does not let you) see the bottom|\\bno deja pasar la luz");
    private static final Pattern ROSE_HUE = Pattern.compile("rosa|rosado|\\brose\\b|pink|salmon|piel de cebolla|onion|coral"
            + "|clarete");
    private static final Pattern ONION_SKIN = Pattern.compile("piel de cebolla|onion|cobriz|cobre|copper");
    private static final Pattern CORAL = Pattern.compile("coral");
    private static final Pattern PEACH = Pattern.compile("durazno|melocoton|damasco|albaricoque|peach|apricot");
    /** A deep rosé: "rosado intenso", "clarete", "rosa cereza claro"; "de intensidad media" is not deep. */
    private static final Pattern DEEP_ROSE = Pattern.compile("\\bintens[oa]s?\\b|\\bprofund[oa]s?\\b|\\boscur[oa]s?\\b|\\bdeep\\b"
            + "|\\bdark\\b|clarete|cereza clar|light cherry|intensidad alta|high intensity");
    private static final Pattern RASPBERRY = Pattern.compile("frambuesa|raspberry|fucsia|fuchsia|cereza|cherry|fresa|frutilla"
            + "|strawberr");
    private static final Pattern SALMON = Pattern.compile("salmon|cobriz|copper|piel de cebolla|onion|coral|durazno|peach");
    private static final Pattern AMBER_HUE = Pattern.compile("ambar|amber|naranja|anaranjad|orange|cobriz|copper");
    private static final Pattern ORANGE_HUE = Pattern.compile("naranja|anaranjad|orange");
    private static final Pattern DARK_AMBER = Pattern.compile("oscur|profund|deep|dark|\\bintens[oa]\\b|tostad|toasted");
    private static final Pattern TOPAZ = Pattern.compile("topacio|topaz");
    /** A red word in the main hue keeps an orange-tinged red ("granate anaranjado") among the reds, not the ambers. */
    private static final Pattern RED_CORE = Pattern.compile("\\b(roj[oa]|red|rubi|ruby|granate|garnet|ladrillo|brick|picota"
            + "|carmesi|crimson)\\b");
    private static final Pattern WHITE_HUE = Pattern.compile("amarill|yellow|paj|straw|dorad|golden|gold|oro viejo|limon|lemon"
            + "|verdos|green|blanc|white|platead|silver|acerad|steel|incoloro|acuos|colorless|colourless|watery|topacio|topaz");
    private static final Pattern WATER = Pattern.compile("incoloro|acuos|colorless|colourless|watery|water-white"
            + "|casi transparente|almost transparent|nearly transparent");
    private static final Pattern STEEL = Pattern.compile("acerad|steel|platead|silver");
    private static final Pattern GOLD = Pattern.compile("dorad|golden|gold|oro");
    /** Old gold ("oro viejo") is a deeper, browner gold than plain gold. */
    private static final Pattern OLD_GOLD = Pattern.compile("oro viejo|old[- ]gold");
    private static final Pattern GREEN = Pattern.compile("verd|green");
    private static final Pattern LEMON = Pattern.compile("limon|lemon");
    private static final Pattern RED_HUE = Pattern.compile("rojo|red|rubi|ruby|granate|garnet|violac|violet|purpur"
            + "|purpl|teja|tawny|brick|ladrillo|cereza|cherry|picota|carmesi|crimson|ciruela|plum|negro|inky|tinta|black");
    /** Tawny is the browner, evolved red; a marked brick or orange tinge is its own redder tone. */
    private static final Pattern TAWNY = Pattern.compile("teja(?! marcad)|atejad|tawny");
    private static final Pattern BRICK = Pattern.compile("ladrillo|brick|teja marcad|naranja|anaranjad|orange");
    /** Near-black reds; black cherry ("cereza negra") stays the deep ruby. */
    private static final Pattern INKY = Pattern.compile("(?<!cereza )negr|(?<!cereza )tinta|entintad|inky|\\bink\\b"
            + "|black(?![ -]?cherr)");
    private static final Pattern PLUM = Pattern.compile("ciruela|plum");
    /** A bright, vivid violet without a dark or deep word is the young violet, not the dark purple. */
    private static final Pattern BRIGHT = Pattern.compile("brillant|viv[oa]|vivaz|vivid|bright|electric|luminos");
    private static final Pattern GARNET = Pattern.compile("granate|garnet");
    private static final Pattern PURPLE = Pattern.compile("violac|violeta|violet|purpur|purpl");
    /** Black cherry ("picota", "cereza negra") is a deep red; plain cherry is its own brighter hue. */
    private static final Pattern BLACK_CHERRY = Pattern.compile("picota|cereza negra|black[ -]?cherry");
    private static final Pattern CHERRY = Pattern.compile("cereza|cherry");
    private static final Pattern PALE = Pattern.compile("claro|palid|ligero|light|pale|tenue|faint|baja|\\blow");
    /** Translucency lightens the hue only when the line gives no medium depth. */
    private static final Pattern TRANSLUCENT = Pattern.compile("translucid|translucent");
    private static final Pattern MEDIUM = Pattern.compile("medi|medium|moderad|moderate|brillante|bright");
    /** Words for a play of light on the wine: reflections, glints, flashes, the rim, brightness. */
    private static final Pattern HIGHLIGHTS = TastingText.keywords("reflej*", "destell*", "brill*", "ribete*", "bordes?",
            "matiz", "matices", "irisad*", "reflect*", "highlight*", "glint*", "flash*", "sheen", "shimmer*", "rims?",
            "edges?", "bright*", "hints?", "tinges?", "glimmer*", "hues?", "tints?");
    /** A hue the line rules out ("sin tonos teja", "without brick tones") is not shown. */
    private static final Pattern NEGATED = Pattern.compile("\\b(sin|ni|no|without|not|nor)\\b[^,.;:]*");
    private static final Pattern DEEP = Pattern.compile("profund|intens|oscur|deep|dark|concentr");
    /** Clauses of the nuances: a tone named in a clause about the core ("un centro algo más dorado") is not the rim. */
    private static final Pattern CLAUSE_BREAK = Pattern.compile("[,;.]| y | and | que | than | that | which | hacia "
            + "| towards? | (?:fades?|fading|shifts?|shifting|lightens?|lightening|turns?|turning|vira|pasa|se aclara"
            + "|se vuelve) ");
    private static final Pattern CORE_WORDS = Pattern.compile("\\b(centro|central|nucleo|corazon|core|center|centre)\\b");
    /** "... y un borde ladrillo": where a core clause hands over to its rim. */
    private static final Pattern TO_RIM = Pattern.compile(" (?:y|and) (?=[^,.;:]*\\b(?:bordes?|ribetes?|rims?|edges?)\\b)");
    private static final Pattern RIM_WORDS = Pattern.compile("\\b(bordes?|ribetes?|menisco|rims?|edges?|meniscus|orillas?"
            + "|contornos?|franjas?)\\b");

    /**
     * A nuance word and the tone it paints at the rim, per wine family: "verdoso" is green on a white, never on a red.
     * Copper ("reflejos cobrizos") is the tawny tone, so it shows against an amber or salmon core.
     */
    private record Nuance(Pattern words, WineColorTone tone) {
        private Nuance(String words, WineColorTone tone) {
            this(Pattern.compile(words), tone);
        }
    }

    private static final List<Nuance> RED_RIMS = List.of(
            new Nuance("(?:violac|violet|purpur|purpl)\\w*[ -](?:brillantes?|viv[oa]s?|vivaz|vivid|bright|electric\\w*"
                    + "|luminos[oa]s?)|(?:bright|vivid|electric) (?:violet|purple)", RED_VIOLET_BRIGHT),
            new Nuance("(?<!bright )(?<!vivid )(?<!electric )(?:violac|violeta|violet|purpur|purpl)|morad|azul|blu|magenta",
                    RED_PURPLE),
            new Nuance("ladrillo|brick|naranja|anaranjad|orange", RED_BRICK),
            new Nuance("teja|atejad|tawny|cobriz|copper|castan|chestnut|marron|amarronad|brown", RED_TAWNY),
            new Nuance("ambar|amber|ocre|ochre", AMBER),
            new Nuance("granate|garnet", RED_GARNET),
            new Nuance("rubi|ruby|rojiz|reddish", RED_RUBY),
            new Nuance("ciruela|plum", RED_PLUM),
            new Nuance("picota|cereza negra|black[ -]?cherr", RED_RUBY_DEEP),
            new Nuance("(?<!cereza )negr|(?<!cereza )tinta|inky|\\bink\\b|black(?![ -]?cherr)", RED_INKY),
            new Nuance("cereza(?! negra)|(?<!black )(?<!black-)cherry|carmesi|crimson", RED_CHERRY));
    private static final List<Nuance> WHITE_RIMS = List.of(
            new Nuance("platead|plata|silver|acerad|steel", WHITE_STEEL),
            new Nuance("verd|green", WHITE_GREEN),
            new Nuance("incoloro|acuos|watery|colorless|colourless", WHITE_WATER),
            new Nuance("limon|lemon", WHITE_LEMON),
            new Nuance("oro viejo|old[- ]gold", WHITE_OLD_GOLD),
            new Nuance("topacio|topaz", WHITE_TOPAZ),
            new Nuance("\\boro\\b(?! viejo)|dorad|(?<!old[- ])gold", WHITE_GOLD),
            new Nuance("naranja|anaranjad|orange", ORANGE),
            new Nuance("ambar|amber|cobriz|copper", AMBER),
            new Nuance("marron|castan|brown|chestnut", WHITE_BROWN),
            new Nuance("paj|straw", WHITE_STRAW));
    private static final List<Nuance> ROSE_RIMS = List.of(
            new Nuance("cobriz|cobre|copper|piel de cebolla|onion", ROSE_COPPER),
            new Nuance("coral", ROSE_CORAL),
            new Nuance("durazno|melocoton|damasco|albaricoque|peach|apricot", ROSE_PEACH),
            new Nuance("salmon|naranja|anaranjad|orange", ROSE_SALMON),
            new Nuance("frambuesa|raspberry|cereza|cherry|fresa|frutilla|strawberr|fucsia|fuchsia|violac|violet|magenta",
                    ROSE_RASPBERRY),
            new Nuance("ambar|amber", AMBER));
    private static final List<Nuance> AMBER_RIMS = List.of(
            new Nuance("verd|green|oliva|olive", WHITE_GREEN),
            new Nuance("marron clar|castan\\w* clar|light brown|pale brown", WHITE_BROWN),
            new Nuance("caoba|mahogany|marron|brown|castan|chestnut", MAHOGANY),
            new Nuance("cobriz|cobre|copper", RED_TAWNY),
            new Nuance("naranja|anaranjad|orange", ORANGE),
            new Nuance("ambar|amber", AMBER),
            new Nuance("oro viejo|old[- ]gold", WHITE_OLD_GOLD),
            new Nuance("topacio|topaz", WHITE_TOPAZ),
            new Nuance("dorad|golden|(?<!old[- ])gold", WHITE_GOLD));

    public static Optional<WineColorTone> fromDescription(String color) {
        if (Objects.isNull(color) || color.isBlank()) {
            return Optional.empty();
        }
        String main = mainAndNuances(normalized(color))[0];
        if (MAHOGANY_HUE.matcher(main).find()) {
            return Optional.of(MAHOGANY_ITSELF.matcher(main).find() ? MAHOGANY : WHITE_BROWN);
        }
        if (ROSE_HUE.matcher(main).find()) {
            return Optional.of(rose(main));
        }
        if (TOPAZ.matcher(main).find()) {
            return Optional.of(WHITE_TOPAZ);
        }
        if (AMBER_HUE.matcher(main).find() && !RED_CORE.matcher(main).find()) {
            return Optional.of(amber(main));
        }
        if (WHITE_HUE.matcher(main).find()) {
            return Optional.of(white(main));
        }
        if (RED_HUE.matcher(main).find()) {
            return Optional.of(red(main));
        }
        return Optional.empty();
    }

    /** Whether the line names a play of light ("con reflejos violáceos", "destellos", "ribete", "brillante"). */
    public static boolean namesHighlights(String color) {
        return Objects.nonNull(color) && HIGHLIGHTS.matcher(normalized(color)).find();
    }

    /**
     * The tone at the rim: the first nuance after the main hue ("con reflejos teja en los bordes") that names a
     * different tone of the same wine family. Empty when the line adds no other tone.
     */
    public static Optional<WineColorTone> rimFromDescription(String color) {
        return fromDescription(color).flatMap(core -> nuanceTones(color, true).stream()
                .filter(tone -> tone != core).findFirst());
    }

    /**
     * Every tone the nuances after the main hue name ("con reflejos violáceos y matices teja": purple, then tawny),
     * in the order the text names them, without repeats. A reflection in the core's own tone counts too ("rojo
     * violáceo con reflejos púrpura"): the stroke's edges deepen to it.
     */
    public static List<WineColorTone> reflectionsFromDescription(String color) {
        return nuanceTones(color, false);
    }

    /** The nuance tones in text order; for the rim, tones named only about the core are left out. */
    private static List<WineColorTone> nuanceTones(String color, boolean rimOnly) {
        Optional<WineColorTone> core = fromDescription(color);
        if (core.isEmpty()) {
            return List.of();
        }
        String nuances = mainAndNuances(normalized(color))[1];
        if (nuances.isBlank()) {
            return List.of();
        }
        TreeMap<Integer, WineColorTone> byPosition = new TreeMap<>();
        for (Nuance nuance : core.get().rims()) {
            Matcher matcher = nuance.words().matcher(nuances);
            while (matcher.find()) {
                if (!rimOnly || !aboutTheCore(nuances, matcher.start())) {
                    byPosition.putIfAbsent(matcher.start(), nuance.tone());
                }
            }
        }
        return byPosition.values().stream().distinct().toList();
    }

    /** Whether the clause around a position speaks of the core and not of the rim. */
    private static boolean aboutTheCore(String nuances, int position) {
        int start = 0;
        int end = nuances.length();
        Matcher breaks = CLAUSE_BREAK.matcher(nuances);
        while (breaks.find()) {
            if (breaks.end() <= position) {
                start = breaks.end();
            } else if (breaks.start() > position) {
                end = breaks.start();
                break;
            }
        }
        String clause = nuances.substring(start, end);
        return CORE_WORDS.matcher(clause).find() && !RIM_WORDS.matcher(clause).find();
    }

    /**
     * The depth of the core: pale, medium or deep, from the main hue or the clause right after it ("Amarillo pajizo,
     * de intensidad media, ..."). Empty when the core names no depth; rim and reflection clauses do not count.
     */
    public static Optional<WineColorIntensity> intensityFromDescription(String color) {
        if (Objects.isNull(color) || color.isBlank()) {
            return Optional.empty();
        }
        String[] parts = mainAndNuances(normalized(color));
        boolean red = fromDescription(color).map(tone -> tone.rims() == RED_RIMS).orElse(false);
        Optional<WineColorIntensity> core = depth(parts[0], red);
        for (String clause : DEPTH_CLAUSE_BREAK.split(parts[1])) {
            if (core.isPresent()) {
                break;
            }
            if (CORE_WORDS.matcher(clause).find() || !RIM_OR_GLINT.matcher(clause).find()) {
                core = depth(clause, red);
            }
        }
        return core;
    }

    /** Seeing the bottom of the glass through the wine is pale for whites and rosés, medium for a red. */
    private static Optional<WineColorIntensity> depth(String text, boolean red) {
        if (PALE_MIXED.matcher(text).find()) {
            return Optional.of(WineColorIntensity.PALE);
        }
        if (DEEP_MIXED.matcher(text).find()) {
            return Optional.of(WineColorIntensity.DEEP);
        }
        if (MEDIUM_DEPTH.matcher(text).find()) {
            return Optional.of(WineColorIntensity.MEDIUM);
        }
        if (DEEP_DEPTH.matcher(text).find()) {
            return Optional.of(WineColorIntensity.DEEP);
        }
        if (DEFINED_COLOR.matcher(text).find()) {
            return Optional.of(WineColorIntensity.MEDIUM);
        }
        if (SEE_THROUGH.matcher(text).find()) {
            return Optional.of(red ? WineColorIntensity.MEDIUM : WineColorIntensity.PALE);
        }
        return PALE_DEPTH.matcher(text).find() ? Optional.of(WineColorIntensity.PALE) : Optional.empty();
    }

    /**
     * Splits a line into its main hue and the nuances. A line that opens with the hue keeps it as the main hue. A line
     * that opens with the light, the glass or the rim ("A la luz, un ribete violeta enmarca un centro casi negro")
     * takes its main hue from the first clause about the core, or else the first hue clause off the rim and reflections.
     */
    private static String[] mainAndNuances(String line) {
        String[] leading = leadingHue(line);
        if (namesHue(leading[0]) && !RIM_OR_GLINT.matcher(leading[0]).find()) {
            return leading;
        }
        String core = null;
        String offRim = null;
        int start = 0;
        Matcher breaks = SEGMENT_BREAK.matcher(line);
        while (start <= line.length()) {
            int end = breaks.find() ? breaks.start() : line.length();
            String segment = coreBeforeRim(line.substring(start, end));
            if (namesHue(segment)) {
                if (Objects.isNull(core) && CORE_WORDS.matcher(segment).find()) {
                    core = segment;
                } else if (Objects.isNull(offRim) && !RIM_OR_GLINT.matcher(segment).find()) {
                    offRim = segment;
                }
            }
            start = end == line.length() ? end + 1 : breaks.end();
        }
        String main = Objects.nonNull(core) ? core : offRim;
        if (Objects.isNull(main)) {
            return leading;
        }
        int at = line.indexOf(main);
        return new String[] {main, line.substring(0, at) + " " + line.substring(at + main.length())};
    }

    /** A clause about the core keeps only its core when it goes on to the rim ("rubí granate y un borde ladrillo"). */
    private static String coreBeforeRim(String segment) {
        Matcher toRim = TO_RIM.matcher(segment);
        if (!toRim.find()) {
            return segment;
        }
        String head = segment.substring(0, toRim.start());
        return namesHue(head) && CORE_WORDS.matcher(head).find() ? head : segment;
    }

    /** The main hue as a line that opens with it reads: up to the first comma, period, "con" clause or rim verb. */
    private static String[] leadingHue(String line) {
        Matcher end = MAIN_CLAUSE_END.matcher(line);
        while (end.find()) {
            String main = line.substring(0, end.start());
            if (namesHue(main) || !",".equals(end.group())) {
                return new String[] {main, line.substring(end.end())};
            }
        }
        return new String[] {line, ""};
    }

    private static boolean namesHue(String text) {
        return List.of(MAHOGANY_HUE, ROSE_HUE, TOPAZ, AMBER_HUE, WHITE_HUE, RED_HUE).stream()
                .anyMatch(hue -> hue.matcher(text).find());
    }

    private List<Nuance> rims() {
        return switch (this) {
            case WHITE_GREEN, WHITE_LEMON, WHITE_STRAW, WHITE_GOLD, WHITE_OLD_GOLD, WHITE_WATER, WHITE_STEEL, WHITE_TOPAZ
                    -> WHITE_RIMS;
            case AMBER, AMBER_DARK, ORANGE, MAHOGANY, WHITE_BROWN -> AMBER_RIMS;
            case ROSE_PALE, ROSE_SALMON, ROSE_RASPBERRY, ROSE_RASPBERRY_LIGHT, ROSE_COPPER, ROSE_CORAL, ROSE_PEACH,
                    ROSE_DEEP -> ROSE_RIMS;
            case RED_PURPLE, RED_RUBY_LIGHT, RED_CHERRY, RED_RUBY, RED_RUBY_DEEP, RED_GARNET, RED_TAWNY, RED_INKY,
                    RED_VIOLET_BRIGHT, RED_PLUM, RED_BRICK -> RED_RIMS;
        };
    }

    /**
     * Copper and onion skin, coral, peach and deep pinks come first, but a deep salmon ("rosa salmón intenso") stays
     * salmon; a light or pale raspberry pink ("rosa frambuesa
     * claro", "rosa frutilla muy pálido") is its own lighter tone.
     */
    private static WineColorTone rose(String main) {
        if (ONION_SKIN.matcher(main).find()) {
            return ROSE_COPPER;
        }
        if (CORAL.matcher(main).find()) {
            return ROSE_CORAL;
        }
        if (PEACH.matcher(main).find()) {
            return ROSE_PEACH;
        }
        if (DEEP_ROSE.matcher(main).find() && !SALMON.matcher(main).find()
                && !PALE.matcher(main.replace("cereza clar", "")).find()) {
            return ROSE_DEEP;
        }
        if (RASPBERRY.matcher(main).find()) {
            return PALE.matcher(main).find() ? ROSE_RASPBERRY_LIGHT : ROSE_RASPBERRY;
        }
        return SALMON.matcher(main).find() ? ROSE_SALMON : ROSE_PALE;
    }

    /** Orange ("ámbar anaranjado") and a dark amber are their own tones; copper alone stays amber. */
    private static WineColorTone amber(String main) {
        if (ORANGE_HUE.matcher(main).find()) {
            return ORANGE;
        }
        return DARK_AMBER.matcher(main).find() ? AMBER_DARK : AMBER;
    }

    /** Green counts only in the main hue ("amarillo verdoso"); "amarillo pálido con reflejos verdosos" is straw. */
    private static WineColorTone white(String main) {
        if (WATER.matcher(main).find()) {
            return WHITE_WATER;
        }
        if (OLD_GOLD.matcher(main).find()) {
            return WHITE_OLD_GOLD;
        }
        if (GOLD.matcher(main).find()) {
            return WHITE_GOLD;
        }
        if (STEEL.matcher(main).find()) {
            return WHITE_STEEL;
        }
        if (GREEN.matcher(main).find()) {
            return WHITE_GREEN;
        }
        return LEMON.matcher(main).find() ? WHITE_LEMON : WHITE_STRAW;
    }

    private static WineColorTone red(String main) {
        if (TAWNY.matcher(main).find()) {
            return RED_TAWNY;
        }
        if (BRICK.matcher(main).find()) {
            return RED_BRICK;
        }
        if (GARNET.matcher(main).find()) {
            return RED_GARNET;
        }
        if (INKY.matcher(main).find()) {
            return RED_INKY;
        }
        if (PLUM.matcher(main).find()) {
            return RED_PLUM;
        }
        if (PURPLE.matcher(main).find()) {
            return BRIGHT.matcher(main).find() && !DEEP.matcher(main).find() ? RED_VIOLET_BRIGHT : RED_PURPLE;
        }
        boolean medium = MEDIUM.matcher(main).find();
        if (PALE.matcher(main).find() || (!medium && TRANSLUCENT.matcher(main).find())) {
            return RED_RUBY_LIGHT;
        }
        if (BLACK_CHERRY.matcher(main).find() || (!medium && DEEP.matcher(main).find())) {
            return RED_RUBY_DEEP;
        }
        return CHERRY.matcher(main).find() ? RED_CHERRY : RED_RUBY;
    }

    private static String normalized(String color) {
        return NEGATED.matcher(HIDDEN_BOTTOM.matcher(TastingText.normalized(color)).replaceAll("opaco")).replaceAll("");
    }
}
