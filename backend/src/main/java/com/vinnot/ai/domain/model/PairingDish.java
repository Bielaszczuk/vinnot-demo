package com.vinnot.ai.domain.model;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The illustrated dish a food pairing shows. A dish form (pizza, empanada, pâté, rice, risotto, curry, tart, pasta) names
 * what is on the plate whatever its filling, so "lamb empanada" is an empanada and "pumpkin risotto" a risotto. Otherwise
 * a pairing names its main dish first and its sides after ("lomo de cerdo con manzanas": pork), so the keyword found
 * earliest wins and a tie at the same position goes to the earlier constant ("queso de cabra" is goat cheese before
 * cheese). Side words (mushrooms, olives, generic meat) show their own dish only when no other dish is named.
 * A pairing with no faithful picture (cheesecake, couscous, fruit salad) and unknown pairings map to no dish: the art
 * never shows a wrong dish or a topping the dish does not have.
 */
public enum PairingDish {
    PATE("pates?", "terrinas?", "terrines?"),
    PIZZA("pizzas?", "fugazza*"),
    /** A meat pie under mashed potato (pastel de carne, cottage or shepherd's pie): the pie, not the meat. */
    MEAT_PIE("pastel(es)? de (carne|cordero|papas?)", "(meat|cottage|shepherd['’]?s) pies?"),
    /** A potato omelette or frittata, whatever it holds. */
    OMELETTE("tortillas? (de (papas?|patatas?)|espanolas?)", "(spanish )?(potato )?omelet(te)?s?", "frittatas?"),
    /** A breaded cutlet (milanesa, schnitzel), whatever the meat. */
    BREADED_CUTLET("milanesas?", "schnitzels?", "escalopes? (empanad|apanad)\\w*", "breaded( \\w+)? cutlets?",
            "cotolett[ae]"),
    EMPANADAS("empanadas?", "empanaditas?", "humita pastr(y|ies)"),
    SEAFOOD_RICE("paellas?(?! valenciana)", "arroz (con|de) (mariscos|frutos de mar|langostinos|camarones|calamares)",
            "seafood (rice|paellas?)"),
    RISOTTO("risotto", "arroz", "rice"),
    CURRY("curr(y|ies)", "currys?"),
    SAVORY_TART("quiches?", "tartas? saladas?", "tartas? finas? de tomates?", "savou?ry( [\\w-]+){0,3} tarts?",
            "tartas? de (puerros?|cebollas?( caramelizadas?)?|quesos?( de cabra)?|ricota|verduras|espinacas?|acelgas?|"
                    + "tomates?|hongos|calabaza|zapallitos?|berenjenas?)",
            "(leek|onion|caramelized onion|tomato|goat(['’]s)? cheese|cheese|ricotta|spinach|mushroom|vegetable|eggplant|aubergine)"
                    + "( and [\\w-]+( [\\w-]+)?)? tarts?",
            "tarts? with( [\\w-]+){0,2} (tomato(es)?|onions?|leeks?|mushrooms?|spinach|vegetables?)"),
    FLAN("flan(es)?", "creme caramel"),
    NUT_TART("tartas? de (nuez|nueces)( pecan)?", "(pecan|walnut|nut)( \\w+)? tarts?", "pecan pies?"),
    COUSCOUS("cuscus", "couscous"),
    FRUIT_TART("tartas? (fina )?de (damascos?|albaricoques?|duraznos?|peras?|frutillas?|manzanas?|frutas?|limon|"
                    + "almendras?|ciruelas?|cerezas?|membrillo|naranjas?( amargas?)?)",
            "(apricot|peach|pear|strawberry|apple|lemon|fruit|almond|plum|cherry|(bitter[- ])?orange)( and \\w+| meringue)? (tarts?|cakes?)",
            "tarts? with (toasted )?almonds?",
            "tortas? de (almendras?|frutas?)", "crumbles?", "frangipane",
            "peras? (asadas?|al horno|especiadas|al vino|escalfadas?|pochadas?)", "(baked|poached|spiced|roasted)( \\w+)? pears?"),
    PASTA("pastas?(?! (dura|firme|blanda|semidura|semiblanda|azul|cremosa|untuosa|lavada|prensada|hilada|compacta))", "pappardelle", "tallarines", "fideos?", "lasanas?", "raviol*", "noquis", "tortel*", "spaghetti",
            "gnocchi", "lasagnas?", "tagliatelle", "tajarin"),
    /** Almond biscuits (biscotti, cantucci). */
    BISCOTTI("biscotti", "cantucci", "galletas? de almendras?", "almond (biscuits?|cookies?)"),
    GOAT_CHEESE("quesos? (\\w+ ){0,3}de cabra", "goat(['’]s)?([- ]milk)?[- ]cheeses?", "chevre"),
    CHEESE("quesos?", "provoletas?", "provolones?", "parmesano", "cheeses?", "parmesan", "brie", "camembert", "gouda", "pecorino", "manchego", "kefalotyri", "cheddar",
            "graviera"),
    BEEF("bifes?", "vacio", "entranas?", "ternera", "entrecot(e|es)?", "(carnes?|costillas?) de res",
            "hamburguesas?(?! de (cordero|hongos|portobellos?|pollo|lentejas|garbanzos|quinoa|pescado))",
            "beef(?! stews?)", "steaks?", "brisket", "rib-?eyes?", "sirloin", "short ribs?", "ragus? de res",
            "costillas? de tira", "tiras? de asado", "tenderloin", "veal"),
    LAMB("cordero", "chivitos?", "cabrito", "lamb", "braised lamb", "shepherd['’]?s pies?"),
    PORK("cerdo", "bondiola", "salchichas?", "chorizos?", "pork", "sausages?"),
    POULTRY("pollo", "pavo", "carnes? blancas?", "chicken", "turkey", "poultry", "white meats?"),
    DUCK("pato", "magret", "foie( gras)?", "duck"),
    /** Venison and other furred game: their own dish, never beef. */
    GAME("ciervos?", "venados?", "corzos?", "jabali(es)?", "carnes? de caza", "venison", "wild boar", "game(?! birds?)"),
    FISH("truchas?", "salmon", "lenguado", "merluza", "corvina", "atun", "pescados?", "ceviche", "sardinas?", "lubina",
            "bacalao", "tiradito", "salmonetes?", "boquerones?", "anchoas?", "fish", "trout", "sole", "tuna", "cod", "sea bass", "red mullet", "anchov(y|ies)", "sardines?", "sushi", "sashimi",
            "hake", "flounder", "fluke"),
    SEAFOOD("ostras?", "mariscos?", "langostinos?", "gambas?", "camaron(es)?", "mejillon(es)?", "vieiras?", "pulpo",
            "calamar(es)?", "almejas?", "oysters?", "shellfish", "shrimps?", "prawns?", "mussels?", "scallops?", "octopus",
            "squid", "calamari", "clams?", "seafood"),
    CHARCUTERIE("jamon", "salame", "fiambres?", "prosciutto", "embutidos?", "ham", "salami", "charcuterie"),
    SALAD("ensaladas?(?! (de|con) (pollo|camarones|langostinos|mariscos|quesos?|atun|salmon|pulpo|jamon|lentejas|"
            + "garbanzos))", "salads?"),
    GREEN_VEGETABLES("esparragos?", "alcachofas?", "asparagus", "artichokes?"),
    VEGETABLES("berenjenas?", "calabazas?", "zapallos?", "calabacin(es)?", "verduras?", "vegetal(es)?", "eggplants?",
            "aubergines?", "squash", "pumpkins?", "zucchinis?", "courgettes?", "vegetables?", "remolachas?", "beets?",
            "beetroots?"),
    /** Its own burgers; otherwise read only from the side words below, when the pairing names no other dish. */
    MUSHROOMS("hamburguesas? de (hongos|portobellos?)", "(portobello|mushroom)( mushroom)? burgers?",
            "(hongos |champinones )?portobellos? rellenos?", "portobellos? stuffed", "stuffed (portobellos?|mushrooms?)"),
    /** Read only from the side words below, when the pairing names no other dish. */
    OLIVES,
    LEGUMES("lentejas?", "garbanzos?", "porotos?", "legumbres?", "lentils?", "chickpeas?", "beans?"),
    STEW("(estofados?|guisos?)(?! de (lentejas|garbanzos|porotos|legumbres))", "brasead*", "osobucos?", "locro",
            "stews?", "braised(?! (lamb|pork|beef|veal|chicken|duck|rabbit))", "osso ?bucos?", "casseroles?"),
    DESSERT("chocolates?", "cacao", "brownies?", "pan de especias", "spiced bread", "gingerbread");

    /** Pairings with no faithful picture: they show no dish rather than a wrong one. */
    private static final Pattern NO_PICTURE = TastingText.keywords("cheesecakes?", "tartas? de queso al horno",
            "ensaladas? de frutas", "fruit salads?", "frutas? frescas?", "fresh fruits?", "kofte", "panna cotta");

    /**
     * Forms of a dish and the words that name them: the first one named wins over any filling, animal or side. A fruit
     * tart is a form only as a tart or crumble ("queso azul con pera asada" stays cheese), and chocolate names the
     * dessert form ("chocolate and cherry tart").
     */
    private static final List<Form> FORMS = List.of(new Form(PATE, PATE.words), new Form(PIZZA, PIZZA.words),
            new Form(MEAT_PIE, MEAT_PIE.words), new Form(OMELETTE, OMELETTE.words),
            new Form(BREADED_CUTLET, BREADED_CUTLET.words),
            new Form(EMPANADAS, EMPANADAS.words), new Form(SEAFOOD_RICE, SEAFOOD_RICE.words),
            new Form(RISOTTO, RISOTTO.words), new Form(CURRY, CURRY.words), new Form(SAVORY_TART, SAVORY_TART.words),
            new Form(FLAN, FLAN.words), new Form(NUT_TART, NUT_TART.words), new Form(COUSCOUS, COUSCOUS.words),
            new Form(DESSERT, TastingText.keywords("chocolates?", "cacao", "brownies?")),
            new Form(FRUIT_TART, TastingText.keywords(
                    "tartas? (fina )?de (damascos?|albaricoques?|duraznos?|peras?|frutillas?|manzanas?|frutas?|"
                            + "limon|almendras?|ciruelas?|cerezas?|membrillo|naranjas?( amargas?)?)",
                    "(apricot|peach|pear|strawberry|apple|lemon|fruit|almond|plum|cherry|(bitter[- ])?orange)( and \\w+| meringue)? (tarts?|cakes?)",
            "tarts? with (toasted )?almonds?",
                    "tortas? de (almendras?|frutas?)", "crumbles?")),
            new Form(PASTA, PASTA.words));

    /** A dish form and the words that name it. */
    private record Form(PairingDish dish, Pattern words) {
    }

    /**
     * Words that also qualify a main dish ("porcini mushroom risotto", "olive-crusted lamb"). They show their own dish
     * only when the pairing names no other one, checked in this order. Meat words that name no animal ("carne",
     * "asado", "lomo", "meat") stand for beef.
     */
    private static final List<Side> SIDES = List.of(
            new Side(TastingText.keywords("hongos?", "setas?", "champinon(es)?", "portobellos?", "mushrooms?"),
                    MUSHROOMS),
            new Side(TastingText.keywords("aceitunas?", "almendras? tostadas?", "tapas", "olives?(?! oil)",
                    "(toasted|roasted|salted) almonds?"), OLIVES),
            new Side(TastingText.keywords("carnes?", "asado", "lomo", "meats?"), BEEF));

    /** A side pattern and the dish it shows. */
    private record Side(Pattern words, PairingDish dish) {
    }

    private final Pattern words;

    PairingDish(String... keywords) {
        this.words = keywords.length == 0 ? null : TastingText.keywords(keywords);
    }

    public static Optional<PairingDish> fromDescription(String pairing) {
        if (Objects.isNull(pairing) || pairing.isBlank()) {
            return Optional.empty();
        }
        String text = TastingText.normalized(pairing);
        if (NO_PICTURE.matcher(text).find()) {
            return Optional.empty();
        }
        Optional<PairingDish> form = earliest(text, FORMS);
        if (form.isPresent()) {
            return form;
        }
        Optional<PairingDish> dish = earliest(text, Arrays.stream(values())
                .filter(value -> Objects.nonNull(value.words)).map(value -> new Form(value, value.words)).toList());
        if (dish.isPresent()) {
            return dish;
        }
        return SIDES.stream()
                .filter(side -> side.words().matcher(text).find())
                .map(Side::dish)
                .findFirst();
    }

    /** The dish whose words start first in the text; a tie goes to the earlier constant. */
    private static Optional<PairingDish> earliest(String text, List<Form> candidates) {
        PairingDish first = null;
        int firstAt = Integer.MAX_VALUE;
        for (Form candidate : candidates) {
            Matcher matcher = candidate.words().matcher(text);
            if (matcher.find() && (matcher.start() < firstAt
                    || (matcher.start() == firstAt && candidate.dish().ordinal() < first.ordinal()))) {
                first = candidate.dish();
                firstAt = matcher.start();
            }
        }
        return Optional.ofNullable(first);
    }
}
