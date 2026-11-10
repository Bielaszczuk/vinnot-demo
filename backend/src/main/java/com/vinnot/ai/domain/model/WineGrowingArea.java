package com.vinnot.ai.domain.model;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Wine-growing areas whose climate and altitude change how a wine's color reads in the glass: altitude and strong
 * sunlight build skin pigment, heat breaks it down, a cool climate keeps color lighter and brighter. Argentina is
 * mapped by subregion; the main world regions coarser. A catalog place that matches no area adds no terroir cue.
 *
 * <p>Sources: Berli et al. 2008 and 2011 (UV-B and Malbec skin anthocyanins, Mendoza); Mori et al. 2007 (heat and
 * anthocyanin loss); elevations from the Vine Connections Argentina map, the Zuccardi Uco Valley terroir guide and the
 * Ribera del Duero regulator; Provence rosé color names from the Provence wine council (CIVP).
 */
public enum WineGrowingArea {
    // Argentina, north to south.
    QUEBRADA_DE_HUMAHUACA(Climate.EXTREME_ALTITUDE, C.AR, "Quebrada de Humahuaca, Jujuy (about 1,700-3,000 m)", null,
            "jujuy", "quebrada de humahuaca", "humahuaca", "tilcara", "maimara", "tumbaya"),
    CALCHAQUI_SALTA(Climate.EXTREME_ALTITUDE, C.AR, "Calchaquí Valleys, Salta (about 1,700-3,100 m)", null,
            "salta", "calchaqui", "calchaquies", "cafayate", "molinos", "cachi", "colome", "tolombon", "payogasta",
            "angastaco", "animana"),
    CALCHAQUI_TUCUMAN(Climate.EXTREME_ALTITUDE, C.AR, "Calchaquí Valleys, Tucumán (about 1,700-2,200 m)", null,
            "tucuman", "amaicha", "amaicha del valle", "colalao del valle", "colalao"),
    CATAMARCA(Climate.HIGH_ALTITUDE, C.AR, "high valleys of Catamarca (about 1,100-2,300 m)", null,
            "catamarca", "fiambala", "tinogasta", "santa maria", "belen"),
    FAMATINA(Climate.WARM, C.AR, "Famatina Valley, La Rioja (about 760-1,860 m, hot and sunny)", null,
            "la rioja", "famatina", "chilecito"),
    SAN_JUAN_HIGH(Climate.HIGH_ALTITUDE, C.AR, "Pedernal, Calingasta and Iglesia, San Juan (about 1,150-2,000 m)", null,
            "pedernal", "calingasta", "iglesia", "barreal"),
    SAN_JUAN(Climate.WARM, C.AR, "Tulum, Zonda and Ullum valleys, San Juan (about 550-900 m, hot and dry)", null,
            "san juan", "tulum", "zonda", "ullum"),
    UCO_VALLEY(Climate.HIGH_ALTITUDE, C.AR, "Uco Valley, Mendoza (about 850-1,700 m)", null,
            "uco", "tupungato", "tunuyan", "gualtallary", "san carlos", "paraje altamira", "altamira", "los chacayes",
            "chacayes", "la consulta", "vista flores", "san pablo", "el cepillo", "los arboles", "el peral"),
    LUJAN_DE_CUYO(Climate.SUNNY_CONTINENTAL, C.AR, "Luján de Cuyo, Mendoza (about 800-1,150 m)", null,
            "lujan de cuyo", "lujan", "agrelo", "perdriel", "vistalba", "las compuertas", "ugarteche",
            "mayor drummond", "chacras de coria", "carrodilla"),
    MAIPU(Climate.WARM, C.AR, "Maipú, Mendoza (about 650-900 m, warmer and lower)", null,
            "maipu", "lunlunta", "barrancas", "cruz de piedra", "russell", "fray luis beltran", "coquimbito"),
    EAST_MENDOZA(Climate.WARM, C.AR, "East Mendoza (about 490-700 m, hot)", null,
            "east mendoza", "este mendocino", "san martin", "junin", "rivadavia", "santa rosa", "la paz"),
    SOUTH_MENDOZA(Climate.WARM, C.AR, "San Rafael and General Alvear, southern Mendoza (about 430-880 m)", null,
            "san rafael", "general alvear"),
    MENDOZA(Climate.SUNNY_CONTINENTAL, C.AR, "Mendoza (vineyards from about 500 to 1,700 m; subregion not stated)",
            null, "mendoza"),
    PATAGONIA(Climate.COOL, C.AR, "Argentine Patagonia (about 38-45°S)", C.PATAGONIA, "patagonia"),
    RIO_NEGRO(Climate.COOL, C.AR, "Alto Valle of Río Negro, Patagonia (about 180-270 m, 39°S)", C.PATAGONIA,
            "rio negro", "alto valle", "general roca", "mainque", "valle medio"),
    NEUQUEN(Climate.COOL, C.AR, "San Patricio del Chañar, Neuquén, Patagonia (about 330-430 m, 38-39°S)", C.PATAGONIA,
            "neuquen", "san patricio del chanar", "anelo"),
    CHUBUT(Climate.COOL, C.AR, "Chubut, Patagonia (42-45°S, the southernmost Argentine vineyards)", C.PATAGONIA,
            "chubut", "trevelin", "16 de octubre", "el hoyo", "comarca andina", "epuyen", "sarmiento", "gaiman"),
    LA_PAMPA(Climate.COOL, C.AR, "La Pampa (about 300-370 m, northern edge of Patagonia)", null,
            "la pampa", "25 de mayo"),
    BUENOS_AIRES(Climate.COOL, C.AR, "Atlantic Buenos Aires (Chapadmalal, about 6 km from the sea, and the southern hills)",
            null, "buenos aires", "chapadmalal", "sierra de la ventana", "medanos", "balcarce", "tandil"),
    CORDOBA(Climate.SUNNY_CONTINENTAL, C.AR, "Córdoba hills (Traslasierra and Calamuchita, about 500-1,300 m)", null,
            "cordoba", "traslasierra", "calamuchita", "colonia caroya"),

    // France.
    BORDEAUX(Climate.TEMPERATE, C.FR, "Bordeaux (Atlantic maritime)", null,
            "bordeaux", "medoc", "pauillac", "margaux", "saint julien", "saint estephe", "pessac leognan", "graves",
            "saint emilion", "pomerol", "fronsac", "entre deux mers", "blaye", "cotes de bourg", "castillon",
            "listrac", "moulis"),
    SAUTERNES(Climate.TEMPERATE, C.FR, "Sauternes and the sweet Bordeaux appellations",
            "botrytised sweet whites, gold that turns topaz and amber with age",
            "sauternes", "barsac", "loupiac", "cadillac", "monbazillac"),
    BURGUNDY(Climate.COOL, C.FR, "Burgundy (cool continental)", null,
            "bourgogne", "burgundy", "cote de nuits", "cote de beaune", "gevrey chambertin", "vosne romanee",
            "nuits saint georges", "chambolle musigny", "morey saint denis", "pommard", "volnay", "meursault",
            "puligny montrachet", "chassagne montrachet", "beaune", "santenay", "mercurey", "givry", "rully",
            "macon", "pouilly fuisse", "saint veran", "vire clesse", "corton", "marsannay", "fixin", "vougeot",
            "monthelie", "auxey duresses", "saint romain", "pernand vergelesses"),
    CHABLIS(Climate.COOL, C.FR, "Chablis (northern Burgundy, cool)", null, "chablis"),
    BEAUJOLAIS(Climate.TEMPERATE, C.FR, "Beaujolais (granite hills, semi-continental)", null,
            "beaujolais", "morgon", "fleurie", "moulin a vent", "brouilly", "julienas", "saint amour", "chiroubles",
            "chenas", "regnie"),
    CHAMPAGNE(Climate.COOL, C.FR, "Champagne (cool northern France)",
            "traditional method, at least 15 months in bottle before release", "champagne", "coteaux champenois"),
    NORTHERN_RHONE(Climate.SUNNY_CONTINENTAL, C.FR, "Northern Rhône (steep granite slopes)", null,
            "northern rhone", "cote rotie", "hermitage", "crozes hermitage", "saint joseph", "cornas", "condrieu", "collines rhodaniennes"),
    SOUTHERN_RHONE(Climate.WARM, C.FR, "Southern Rhône (warm Mediterranean)", null,
            "rhone", "chateauneuf du pape", "gigondas", "vacqueyras", "rasteau", "cairanne", "lirac", "ventoux",
            "luberon", "grignan les adhemar", "costieres de nimes", "tavel", "vinsobres"),
    PROVENCE(Climate.WARM, C.FR, "Provence (Mediterranean)",
            "its rosés are mostly pale, from direct pressing: peach, melon, mango, apricot, pomelo or mandarin hues "
                    + "(the Provence wine council's color names)",
            "provence", "bandol", "coteaux varois", "cassis", "var"),
    LOIRE(Climate.COOL, C.FR, "Loire Valley (cool, Atlantic-influenced)", null,
            "loire", "sancerre", "pouilly fume", "vouvray", "muscadet", "anjou", "saumur", "chinon", "touraine",
            "bourgueil", "menetou salon", "montlouis", "coteaux du layon", "savennieres", "quincy", "reuilly"),
    ALSACE(Climate.COOL, C.FR, "Alsace (cool, dry and sunny, behind the Vosges)", null, "alsace"),
    LANGUEDOC_ROUSSILLON(Climate.WARM, C.FR, "Languedoc-Roussillon (warm Mediterranean)", null,
            "languedoc", "roussillon", "pays d oc", "corbieres", "minervois", "saint chinian", "faugeres", "fitou",
            "pic saint loup", "terrasses du larzac", "la clape", "herault", "aude", "gard", "cotes catalanes",
            "collioure", "banyuls", "maury", "rivesaltes", "limoux"),
    CAHORS(Climate.WARM, C.FR, "Cahors (south-west France)", "Malbec's historic 'black wine', traditionally very dark",
            "cahors", "cotes du lot"),
    MADIRAN(Climate.TEMPERATE, C.FR, "Madiran (south-west France)", "Tannat country, dark and inky reds", "madiran"),

    // Germany and Austria.
    MOSEL(Climate.COOL, C.DE, "Mosel (steep slate slopes, one of the coolest classic regions)",
            "its Riesling is often very pale, almost watery lemon-green", "mosel", "saar", "ruwer"),
    GERMANY(Climate.COOL, C.DE, "German wine regions (cool northern climate, about 47-51°N)", null,
            "rheingau", "rheinhessen", "pfalz", "nahe", "baden", "franken", "wurttemberg", "ahr", "mittelrhein",
            "saale unstrut", "sachsen", "hessische bergstrasse"),
    AUSTRIA(Climate.COOL, C.AT, "Austria (cool continental)", null,
            "niederosterreich", "wachau", "kamptal", "kremstal", "weinviertel", "wagram", "traisental",
            "thermenregion", "carnuntum", "wien", "steiermark", "sudsteiermark", "sudoststeiermark", "weinland"),
    BURGENLAND(Climate.SUNNY_CONTINENTAL, C.AT, "Burgenland (warmer Pannonian plain)", null,
            "burgenland", "neusiedlersee", "leithaberg"),

    // Italy.
    PIEDMONT(Climate.TEMPERATE, C.IT, "Piedmont (continental hills)", null,
            "piemonte", "piedmont", "langhe", "barolo", "barbaresco", "roero", "asti", "alba", "monferrato", "gavi",
            "colli tortonesi", "colline novaresi", "gattinara", "ghemme"),
    TUSCANY(Climate.TEMPERATE, C.IT, "Tuscany (Mediterranean hills)", null,
            "toscana", "tuscany", "chianti", "montalcino", "nobile di montepulciano", "bolgheri", "maremma",
            "morellino di scansano", "san gimignano", "carmignano"),
    VENETO(Climate.TEMPERATE, C.IT, "Veneto (north-east Italy)", null,
            "veneto", "valpolicella", "amarone", "soave", "bardolino", "verona", "garda", "lugana", "custoza",
            "colli euganei", "delle venezie", "piave"),
    PROSECCO(Climate.TEMPERATE, C.IT, "Prosecco hills (north-east Italy)", "tank-method sparkling, released young",
            "prosecco", "conegliano", "valdobbiadene", "asolo", "treviso", "marca trevigiana"),
    ALPINE_ITALY(Climate.COOL, C.IT, "Alto Adige, Trentino and Friuli (cool, Alpine or sub-Alpine)", null,
            "alto adige", "sudtirol", "trentino", "trento", "friuli", "venezia giulia", "collio", "colli orientali",
            "isonzo", "dolomiti", "valle d aosta", "valtellina"),
    CENTRAL_ADRIATIC(Climate.TEMPERATE, C.IT, "Abruzzo and Marche (Adriatic hills)", null,
            "abruzzo", "marche", "rosso piceno", "verdicchio"),
    ETNA(Climate.TEMPERATE, C.IT, "Etna (volcanic slopes, about 400-1,000 m)", null, "etna"),
    SOUTHERN_ITALY(Climate.WARM, C.IT, "southern Italy and the islands (hot Mediterranean)", null,
            "sicilia", "sicily", "terre siciliane", "puglia", "salento", "manduria", "campania", "taurasi", "irpinia",
            "sannio", "basilicata", "calabria", "ciro", "sardegna", "cannonau", "marsala"),

    // Spain.
    RIOJA(Climate.TEMPERATE, C.ES, "Rioja (Ebro valley, Atlantic and continental)", null, "rioja"),
    RIBERA_DEL_DUERO(Climate.HIGH_ALTITUDE, C.ES, "Ribera del Duero (high plateau, about 720-1,100 m, continental)", null,
            "ribera del duero"),
    CASTILLA_Y_LEON(Climate.HIGH_ALTITUDE, C.ES, "Castilla y León and Rueda (high northern plateau)", null,
            "castilla y leon", "rueda", "cigales"),
    TORO(Climate.WARM, C.ES, "Toro (hot, dry continental plateau)", null, "toro"),
    ATLANTIC_SPAIN(Climate.COOL, C.ES, "Rías Baixas and Galicia (cool, rainy Atlantic)", null,
            "rias baixas", "galicia", "ribeiro", "ribeira sacra", "valdeorras", "monterrei", "bierzo", "txakoli",
            "getariako"),
    PRIORAT(Climate.WARM, C.ES, "Priorat and Montsant (hot, steep slate hills)", null, "priorat", "montsant"),
    JEREZ(Climate.WARM, C.ES, "Jerez, Sanlúcar and Montilla (Andalusia)",
            "sherry country, where the color follows the aging style",
            "jerez", "sherry", "xeres", "sanlucar", "manzanilla", "montilla", "cadiz"),
    CAVA(Climate.TEMPERATE, C.ES, "Cava (traditional-method sparkling)", "bottle-fermented on its lees", "cava"),
    CATALONIA(Climate.TEMPERATE, C.ES, "Catalonia (Mediterranean)", null,
            "penedes", "catalunya", "emporda", "terra alta", "conca de barbera", "costers del segre", "tarragona",
            "alella"),
    NORTHERN_SPAIN(Climate.TEMPERATE, C.ES, "Navarra and Aragón (Ebro valley)", null,
            "navarra", "somontano", "carinena", "calatayud", "campo de borja", "aragon"),
    CENTRAL_SPAIN(Climate.WARM, C.ES, "central and south-east Spain (hot continental plateau)", null,
            "la mancha", "castilla", "valdepenas", "manchuela", "jumilla", "yecla", "alicante", "utiel requena",
            "valencia", "murcia", "madrid", "extremadura", "ribera del guadiana", "almansa"),

    // Portugal.
    PORTO(Climate.WARM, C.PT, "Porto and the Douro (Port)", "Port, whose color follows the style", "porto"),
    DOURO(Climate.WARM, C.PT, "Douro (hot schist terraces)", null, "douro", "tras os montes"),
    VINHO_VERDE(Climate.COOL, C.PT, "Vinho Verde and Minho (cool, rainy Atlantic north-west)", null,
            "vinho verde", "minho"),
    SOUTHERN_PORTUGAL(Climate.WARM, C.PT, "Alentejo, Tejo and Setúbal (hot southern plains)", null,
            "alentejo", "alentejano", "tejo", "ribatejo", "setubal", "algarve"),
    CENTRAL_PORTUGAL(Climate.TEMPERATE, C.PT, "Dão, Bairrada and Lisboa (Atlantic-influenced)", null,
            "dao", "bairrada", "beiras", "beira interior", "lisboa"),
    MADEIRA(Climate.WARM, C.PT, "Madeira (subtropical Atlantic island)",
            "Madeira's heated, oxidative aging turns it amber to mahogany", "madeira"),

    // United States.
    NAPA(Climate.SUNNY_CONTINENTAL, C.US, "Napa Valley (warm, sunny days and cool nights)", null,
            "napa", "rutherford", "oakville", "st helena", "calistoga", "howell mountain", "mount veeder", "stags leap",
            "atlas peak", "yountville", "coombsville"),
    COOL_CALIFORNIA(Climate.COOL, C.US, "fog-cooled coastal California", null,
            "russian river", "sonoma coast", "carneros", "anderson", "green valley", "petaluma gap", "rita hills",
            "santa maria", "santa lucia highlands", "edna", "arroyo seco", "monterey", "santa barbara",
            "santa cruz mountains", "mendocino"),
    SONOMA(Climate.TEMPERATE, C.US, "Sonoma County", null, "sonoma", "dry creek", "alexander", "north coast"),
    WARM_CALIFORNIA(Climate.WARM, C.US, "Paso Robles, Lodi and inland California (warm to hot)", null,
            "paso robles", "lodi", "sierra foothills", "amador", "el dorado", "clarksburg", "temecula", "livermore",
            "contra costa", "calaveras"),
    OREGON(Climate.COOL, C.US, "Willamette Valley, Oregon (cool)", null,
            "willamette", "oregon", "eola amity hills", "dundee hills", "chehalem", "yamhill carlton"),
    WASHINGTON(Climate.SUNNY_CONTINENTAL, C.US, "Columbia Valley, Washington (dry, sunny continental, cool nights)", null,
            "columbia", "washington", "yakima", "walla walla", "red mountain", "horse heaven hills", "wahluke slope",
            "rattlesnake hills"),
    NORTH_EAST_US(Climate.COOL, C.US, "Finger Lakes and the north-east (cool)", null,
            "finger lakes", "new york", "seneca lake", "long island", "lake erie", "michigan", "leelanau"),

    // Southern hemisphere.
    WARM_AUSTRALIA(Climate.WARM, C.AU, "Barossa, McLaren Vale and warm inland Australia", null,
            "barossa", "mclaren vale", "langhorne creek", "fleurieu", "riverland", "murray darling", "riverina",
            "rutherglen", "swan", "heathcote"),
    COOL_AUSTRALIA(Climate.COOL, C.AU, "cool Australian regions (Adelaide Hills, Yarra, Tasmania and others)", null,
            "adelaide hills", "yarra", "tasmania", "mornington peninsula", "macedon ranges", "geelong", "orange",
            "canberra district", "eden", "great southern", "frankland river", "gippsland", "king"),
    MARITIME_AUSTRALIA(Climate.TEMPERATE, C.AU, "Coonawarra, Margaret River and maritime Australia", null,
            "coonawarra", "margaret river", "limestone coast", "wrattonbully", "padthaway"),
    HUNTER_VALLEY(Climate.WARM, C.AU, "Hunter Valley (warm and humid)",
            "Hunter Semillon starts very pale and turns golden with bottle age", "hunter", "mudgee"),
    MARLBOROUGH(Climate.COOL, C.NZ, "Marlborough (cool and sunny, with strong UV)", null,
            "marlborough", "awatere", "wairau"),
    COOL_NEW_ZEALAND(Climate.COOL, C.NZ, "Central Otago, Nelson, Martinborough and Canterbury (cool)", null,
            "central otago", "otago", "nelson", "martinborough", "wairarapa", "waipara", "canterbury"),
    NORTH_ISLAND(Climate.TEMPERATE, C.NZ, "Hawke's Bay, Gisborne and Waiheke (milder maritime)", null,
            "hawke s bay", "hawkes bay", "gisborne", "waiheke"),
    COASTAL_CHILE(Climate.COOL, C.CL, "Chile's coastal and southern valleys (cooled by the Humboldt Current)", null,
            "casablanca", "san antonio", "leyda", "limari", "malleco", "bio bio", "itata", "osorno"),
    CENTRAL_CHILE(Climate.SUNNY_CONTINENTAL, C.CL, "Chile's Central Valley (sunny Mediterranean)", null,
            "central", "maipo", "rapel", "colchagua", "cachapoal", "curico", "maule", "lontue", "aconcagua", "apalta"),
    STELLENBOSCH(Climate.TEMPERATE, C.ZA, "Stellenbosch, Paarl and the Cape coast (Mediterranean, ocean-moderated)",
            null, "stellenbosch", "paarl", "franschhoek", "wellington", "swartland", "coastal region", "durbanville"),
    COOL_CAPE(Climate.COOL, C.ZA, "Elgin, Walker Bay, Hemel-en-Aarde and Constantia (cool maritime)", null,
            "elgin", "walker bay", "hemel en aarde", "constantia", "cape agulhas", "elim"),
    INLAND_CAPE(Climate.WARM, C.ZA, "Robertson and the Breede River (warm inland)", null,
            "robertson", "breede river", "worcester", "olifants river"),
    URUGUAY(Climate.TEMPERATE, C.UY, "southern Uruguay (humid Atlantic and River Plate climate)", null,
            "canelones", "montevideo", "maldonado", "colonia", "san jose"),
    KAKHETI(Climate.SUNNY_CONTINENTAL, C.GE, "Kakheti (warm continental eastern Georgia)", null,
            "kakheti", "kindzmarauli", "mukuzani", "tsinandali", "napareuli", "gurjaani", "telavi"),
    SERRA_GAUCHA(Climate.COOL, C.BR, "Serra Gaúcha (humid, rainy southern Brazil)", null,
            "serra gaucha", "vale dos vinhedos", "rio grande do sul");

    /** How a climate moves the color of a red, a white and a rosé. */
    public enum Climate {
        EXTREME_ALTITUDE("very high altitude: strong UV-B raises skin anthocyanins and phenols and keeps berries small",
                "an inky, near-opaque core with a vivid violet rim",
                "a luminous straw core with green or golden glints",
                "a vivid, saturated pink with violet glints"),
        HIGH_ALTITUDE("high altitude: strong sunlight and UV-B build pigment while cooler temperatures keep acidity",
                "a deep, saturated core with a lively violet-purple rim and a bright sheen",
                "a pale, luminous lemon with green or silver glints",
                "a bright, clear pink"),
        SUNNY_CONTINENTAL("dry, sunny climate: ripe, well-colored grapes",
                "a ripe, dense core of black cherry or plum with a ruby-purple rim",
                "straw to light gold",
                "a ripe strawberry to raspberry pink"),
        WARM("heat: very hot days break down anthocyanins and raise pH, so color is ripe but less vivid",
                "a ripe plum or black-cherry core whose violet is softer and whose rim turns garnet sooner",
                "deeper straw to gold",
                "a deeper, warmer pink"),
        TEMPERATE("moderate climate",
                "a medium-deep ruby-purple, saturated but not inky",
                "lemon to straw",
                "a medium pink, salmon to strawberry"),
        COOL("cool climate: lower ripeness and lower pH keep color lighter and brighter",
                "a brighter, more translucent ruby with a fresh purple rim",
                "pale lemon with green or silver glints, at times almost colorless",
                "a pale, bright pink, salmon or copper");

        private final String cause;
        private final String red;
        private final String white;
        private final String rose;

        Climate(String cause, String red, String white, String rose) {
            this.cause = cause;
            this.red = red;
            this.white = white;
            this.rose = rose;
        }

        String effect(WineColorEvidence.Family family) {
            return switch (family) {
                case RED -> red;
                case WHITE -> white;
                case ROSE -> rose;
            };
        }
    }

    /** Country spellings (Spanish catalog names and English) and shared notes. */
    private static final class C {
        static final String[] AR = {"argentina"};
        static final String[] FR = {"francia", "france"};
        static final String[] DE = {"alemania", "germany"};
        static final String[] AT = {"austria"};
        static final String[] IT = {"italia", "italy"};
        static final String[] ES = {"espana", "spain"};
        static final String[] PT = {"portugal"};
        static final String[] US = {"estados unidos", "united states", "usa", "united states of america"};
        static final String[] AU = {"australia"};
        static final String[] NZ = {"nueva zelanda", "new zealand"};
        static final String[] CL = {"chile"};
        static final String[] ZA = {"sudafrica", "south africa"};
        static final String[] UY = {"uruguay"};
        static final String[] GE = {"georgia"};
        static final String[] BR = {"brasil", "brazil"};
        static final String PATAGONIA = "long summer days, steady wind and cool nights keep reds a vivid, bright red-violet "
                + "with high acidity";

        private C() {
        }
    }

    private final Climate climate;
    private final Set<String> countries;
    private final String setting;
    private final String note;
    private final List<String> aliases;

    WineGrowingArea(Climate climate, String[] countries, String setting, String note, String... aliases) {
        this.climate = climate;
        this.countries = Set.of(countries);
        this.setting = setting;
        this.note = note;
        this.aliases = Arrays.stream(aliases).map(WineGrowingArea::place).toList();
    }

    /**
     * The area of a catalog place: the winery subregion first, then the region, within the catalog country. Names
     * match as whole words, so an appellation such as "Saint-Émilion Grand Cru" finds Bordeaux; the longest name wins.
     */
    public static Optional<WineGrowingArea> locate(String subregion, String region, String country) {
        String nation = place(country);
        if (nation.isEmpty()) {
            return Optional.empty();
        }
        return within(place(subregion), nation).or(() -> within(place(region), nation));
    }

    private static Optional<WineGrowingArea> within(String name, String nation) {
        if (name.isEmpty()) {
            return Optional.empty();
        }
        String padded = " " + name + " ";
        return Arrays.stream(values())
                .filter(area -> area.countries.contains(nation))
                .flatMap(area -> area.aliases.stream()
                        .filter(alias -> padded.contains(" " + alias + " "))
                        .map(alias -> new Match(area, alias.length())))
                .max(Comparator.comparingInt(Match::length))
                .map(Match::area);
    }

    private record Match(WineGrowingArea area, int length) {
    }

    /** The prompt cue for this area: where it is, what its climate does and how the color of this family shows it. */
    public String cue(WineColorEvidence.Family family) {
        return setting + ": " + climate.cause + "; in the glass, " + climate.effect(family)
                + (Objects.nonNull(note) ? "; " + note : "");
    }

    public Climate climate() {
        return climate;
    }

    /** Lower case without accents or punctuation, and without a leading "Valle(s) de" or trailing "Valley". */
    static String place(String text) {
        if (Objects.isNull(text)) {
            return "";
        }
        String plain = TastingText.normalized(text).replaceAll("[^a-z0-9]+", " ").strip();
        return plain.replaceFirst("^valles? (?:de la |del |de )?", "").replaceFirst(" valleys?$", "").strip();
    }
}
