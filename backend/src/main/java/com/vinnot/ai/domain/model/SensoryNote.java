package com.vinnot.ai.domain.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * The illustrated note an aroma or flavor descriptor shows, such as "Frambuesa en compota" or "Black cherry".
 * Notes are checked in declaration order and the first match wins, so a specific note ("ciruela pasa", "manzana
 * verde", "nuez moscada") comes before the generic one it contains. Words that only qualify a note (citrus, zest,
 * peel, petals, floral, toasted, fruit) are read last, so the fruit, flower or food they qualify wins. Unknown descriptors map to
 * no note: the art never shows a wrong ingredient.
 */
public enum SensoryNote {
    DRIED_FRUIT("ciruelas? (pasas?|secas?|desecadas?)", "pasas?", "higos? secos?", "frutas? secas?", "datil(es)?",
            "prunes?", "raisins?", "dried (figs?|fruits?|plums?)", "dates?"),
    GREEN_APPLE("manzanas? verdes?", "green apples?"),
    HONEYSUCKLE("madreselvas?", "honeysuckles?"),
    WHITE_FLOWERS("flor(es)? blancas?", "azahar", "jazmin(es)?", "acacias?", "tilo", "sauco", "white flowers?",
            "blossoms?", "jasmine", "elderflowers?", "flor(es)? (silvestres?|delicadas?)", "wild ?flowers?",
            "delicate flowers?"),
    CHAMOMILE("manzanilla", "camomila", "chamomile", "camomile"),
    ROASTED_PEPPER("pimientos? (rojos? )?asados?", "roasted (red )?(bell )?peppers?"),
    RED_PEPPER("pimientos? rojos?", "morrones?", "red (bell )?peppers?", "red capsicum"),
    GREEN_PEPPER("pimientos?", "(bell|green) peppers?", "capsicum"),
    DRIED_HERBS("hierbas? (secas?|mediterraneas?|balsamicas?)", "tomillo", "romero", "oregano", "garrigue",
            "dried (mediterranean )?herbs?", "(mediterranean|balsamic) herbs?", "thyme", "rosemary"),
    TOMATO_LEAF("hojas? de (tomates?|tomatera)", "tomateras?", "tomato lea(f|ves)"),
    DRIED_LEAF("hojas? secas?", "hojarasca", "hojas? (de otono|otonales)", "(dried|dry|autumn|fallen) lea(f|ves)"),
    BAY_LEAF("laurel", "bay lea(f|ves)"),
    SWEET_SPICE("canela", "clavos?( de olor)?", "nuez moscada", "especi(as?|ad[oa]s?)", "azafran", "cinnamon", "cloves?",
            "nutmeg", "spic(es?|ed|y)", "saffron", "pimientas? (dulces?|de jamaica)", "allspice"),
    RASPBERRY("frambuesas?", "raspberr*"),
    STRAWBERRY("frutillas?", "fresas?", "strawberr*"),
    /** Black, dark or picota cherries are near-black; the red cherry would lose the qualifier. */
    BLACK_CHERRY("cerezas? (negras?|oscuras?)", "guindas? negras?", "picotas?", "(black|dark) cherr*"),
    CHERRY("cerezas?", "guindas?", "kirsch", "cherr*"),
    BLACKBERRY("moras?", "zarzamoras?", "blackberr*", "brambles?"),
    GOOSEBERRY("grosellas? espinosas?", "gooseberr*"),
    BLACKCURRANT("cass?is", "grosellas? (negras?|oscuras?)", "grosellero", "(black|dark) ?currants?"),
    RED_CURRANT("grosellas?", "arandanos? rojos?", "(red|white)?currants?", "cranberr*"),
    BLUEBERRY("arandanos?", "blueberr*", "bilberr*"),
    PLUM("ciruelas?", "plums?"),
    FIG("higos?", "figs?"),
    BERGAMOT("bergamotas?", "bergamots?"),
    LIME("limas?", "limes?"),
    LEMON("limon(es)?", "lemons?"),
    ORANGE("naranjas?", "mandarinas?", "oranges?", "mandarins?", "tangerines?"),
    GRAPEFRUIT("pomelos?", "grapefruits?"),
    APPLE("manzanas?", "apples?"),
    PEAR("peras?", "pears?"),
    APRICOT("damascos?", "albaricoques?", "apricots?"),
    PEACH("duraznos?", "melocoton(es)?", "nectarinas?", "peach(es)?", "nectarines?", "stone fruits?",
            "frutas? de (hueso|carozo)"),
    QUINCE("membrillos?", "quinces?"),
    PASSION_FRUIT("maracuya", "passion ?fruits?"),
    PINEAPPLE("ananas?", "pinas?", "mangos?", "tropical(es)?", "pineapples?"),
    LYCHEE("lichis?", "litchis?", "lychees?"),
    /** A red, black or red-variety grape ("uva Corvina", "Barbera grape"); a white or plain grape is the green one. */
    RED_GRAPE("uvas? (rojas?|tintas?|negras?|moradas?)", "uvas? (de )?(" + GrapeVarieties.RED + ")",
            "(red|black|purple) grapes?", "(" + GrapeVarieties.RED + ") grapes?"),
    GRAPE("uvas?", "grapes?"),
    /** A white or honeydew melon has pale green flesh; the plain melon is the orange cantaloupe. */
    WHITE_MELON("melon(es)? blancos?", "white melons?", "honeydew"),
    MELON("melon(es)?", "sandias?", "melons?", "watermelons?", "cantaloupes?"),
    POMEGRANATE("granadas?", "pomegranates?"),
    ROSE("rosas?", "flor(es)? (rojas?|rosadas?)", "roses?", "(red|pink) flowers?"),
    VIOLET("violetas?", "violets?"),
    FRESH_HERBS("hierba*", "menta", "eucalipto", "albahaca", "pastos?", "ruda", "herb*", "mint(y)?", "eucalyptus",
            "basil", "grass*", "rue"),
    TEA("te", "teas?"),
    GINGER("jengibre", "ginger"),
    ANISE("anis*", "regaliz", "hinojo", "licorice", "liquorice", "fennel"),
    WHITE_PEPPER("pimientas? blancas?", "white[ -]pepper*"),
    BLACK_PEPPER("pimientas?", "pepper*"),
    WET_EARTH("tierras?", "terros[oa]s?", "sotobosque", "hongos?", "champinon(es)?", "trufas?", "earth*", "forest floor", "woodland",
            "undergrowth", "mushrooms?", "truffles?"),
    BLACK_OLIVE("aceitunas? negras?", "black olives?"),
    MINERAL("piedras?", "mineral*", "tiza", "grafito", "pedernal", "stones?", "chalk*", "flint*", "slate", "graphite"),
    LEATHER("cuero", "leather*"),
    TOBACCO("tabaco", "cigarros?", "tobacco", "cigars?"),
    VANILLA("vainilla", "vanilla"),
    COFFEE("cafe", "espresso", "moka", "coffee", "mocha"),
    CHOCOLATE("chocolate", "cacao", "cocoa"),
    OAK("roble", "maderas?", "barricas?", "cedro", "oak*", "wood*", "cedar"),
    HONEY("miel(es)?", "cera( de abejas?)?", "honey(ed)?", "beeswax", "wax(y)?"),
    CARAMEL("caramel*", "toffee", "dulce de leche", "butterscotch"),
    MOLASSES("melazas?", "molasses", "treacle"),
    BREAD("pan(es)?", "panificacion", "panaderia", "autolisis", "bready", "autolysis", "masa", "levaduras?", "brioche", "galletas?", "migas?", "bread", "yeast*", "dough", "biscuit*",
            "pastry", "pastries"),
    NUTS("nuez", "nueces", "almendras?", "avellanas?", "frutos secos", "pistachos?", "nut(s|ty)?", "almonds?",
            "hazelnuts?", "walnuts?", "pistachios?"),
    BUTTER("manteca", "mantequilla", "butter(y)?"),
    SALINE("salin*", "sal", "salad[oa]s?", "yodo", "marin[oa]s?", "salt(s|y)?", "sea", "iodine"),
    JAM("mermeladas?", "confituras?", "compotas?", "jam(s|my)?", "compotes?"),
    SMOKE("humo", "ahumad*", "smok*"),
    /** Generic fruit has no keywords of its own: it is read last, from the generic fruit words below. */
    MIXED_FRUIT;

    /** Red grape varieties a descriptor may name its grape by ("uva Malbec madura", "ripe Barbera grape"). */
    private static final class GrapeVarieties {
        private static final String RED = "malbec|cabernet( sauvignon| franc)?|merlot|pinot (noir|nero)|syrah"
                + "|shiraz|tempranillo|garnacha( tinta)?|grenache( noir)?|bonarda|barbera|corvina|sangiovese|nebbiolo"
                + "|tannat|zinfandel|primitivo|carmenere|petit verdot|mencia|monastrell|mourvedre|touriga( nacional)?"
                + "|gamay|dolcetto|criolla|cinsault|carignan|carinena|aglianico|lambrusco|montepulciano"
                + "|negroamaro|pinotage";

        private GrapeVarieties() {
        }
    }

    /** A pattern and the note it shows; checked in order, first match wins. */
    private record Rule(Pattern words, SensoryNote note) {
    }

    /** Qualifying words that stand for a note only when the descriptor names no fruit, flower or food. */
    private static final List<Rule> GENERIC_RULES = List.of(
            new Rule(TastingText.keywords("citric*", "citrus", "ralladura", "zest*", "cascaras?", "peels?"), LEMON),
            new Rule(TastingText.keywords("confitad*", "candied"), JAM),
            new Rule(TastingText.keywords("petalos?", "petals?"), ROSE),
            new Rule(TastingText.keywords("floral(es)?"), WHITE_FLOWERS),
            new Rule(TastingText.keywords("tostad*", "toast*"), OAK),
            new Rule(TastingText.keywords("(frutos?|frutas?) (rojos?|rojas?|del bosque)", "red (fruits?|berries)"),
                    RASPBERRY),
            new Rule(TastingText.keywords("(frutos?|frutas?) (negr|oscur)(os?|as?)", "(black|dark)[ -](fruits?|berries)"),
                    BLACKBERRY),
            new Rule(TastingText.keywords("frut*", "fruit*"), MIXED_FRUIT));

    private static final List<Rule> RULES = rules();

    private final Pattern words;

    SensoryNote(String... keywords) {
        this.words = keywords.length == 0 ? null : TastingText.keywords(keywords);
    }

    public static Optional<SensoryNote> fromDescriptor(String descriptor) {
        if (Objects.isNull(descriptor) || descriptor.isBlank()) {
            return Optional.empty();
        }
        String text = TastingText.normalized(descriptor);
        return RULES.stream()
                .filter(rule -> rule.words().matcher(text).find())
                .map(Rule::note)
                .findFirst();
    }

    private static List<Rule> rules() {
        List<Rule> rules = new ArrayList<>();
        for (SensoryNote note : values()) {
            if (Objects.nonNull(note.words)) {
                rules.add(new Rule(note.words, note));
            }
        }
        rules.addAll(GENERIC_RULES);
        return List.copyOf(rules);
    }
}
