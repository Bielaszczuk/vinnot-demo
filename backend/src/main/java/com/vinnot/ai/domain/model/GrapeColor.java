package com.vinnot.ai.domain.model;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * How much color a grape's skins give, the base of a wine's color before place, age and winemaking move it. Pinot
 * Noir has no acylated anthocyanins and little pigment; Nebbiolo has little, peonidin-dominated pigment; Tannat
 * carries more anthocyanin than Cabernet or Merlot when young but loses it faster; teinturier grapes carry pigment in
 * the flesh (VITIS 2004; Molecules 2021; OENO One reviews).
 */
public enum GrapeColor {
    TANNAT(Pigment.INKY, "Tannat: among the most pigmented grapes, near-black when young, though it loses color faster "
            + "with age", "tannat", "harriague"),
    PETIT_VERDOT(Pigment.INKY, "Petit Verdot: very deep, inky purple", "petit verdot"),
    PETITE_SIRAH(Pigment.INKY, "Petite Sirah: inky, almost opaque", "petite sirah", "durif"),
    TEINTURIER(Pigment.INKY, "a teinturier with red flesh: opaque and near-black", "alicante bouschet",
            "garnacha tintorera", "saperavi", "ancellotta", "dunkelfelder"),
    SAGRANTINO(Pigment.INKY, "Sagrantino: very deep, dark purple", "sagrantino"),
    MALBEC(Pigment.DEEP, "Malbec: anthocyanin-rich skins, deep and violet-purple while young", "malbec", "cot"),
    SYRAH(Pigment.DEEP, "Syrah: deep purple to near-black", "syrah", "shiraz"),
    CABERNET_SAUVIGNON(Pigment.DEEP, "Cabernet Sauvignon: small, thick-skinned berries, dark ruby-purple",
            "cabernet sauvignon", "cabernet"),
    BONARDA(Pigment.DEEP, "Bonarda: deep, vivid purple-violet with soft tannin", "bonarda", "douce noir", "charbono",
            "croatina"),
    TOURIGA(Pigment.DEEP, "Touriga: deep, dark purple", "touriga nacional", "touriga franca"),
    MOURVEDRE(Pigment.DEEP, "Mourvèdre/Monastrell: deep, dark ruby", "mourvedre", "monastrell", "mataro"),
    CARMENERE(Pigment.DEEP, "Carménère: deep purple with violet tints", "carmenere"),
    BARBERA(Pigment.DEEP, "Barbera: deep ruby-purple kept bright by high acidity", "barbera"),
    DOLCETTO(Pigment.DEEP, "Dolcetto: deep purple", "dolcetto"),
    SOUTHERN_ITALIAN_DARK(Pigment.DEEP, "a dark southern Italian grape: deep ruby-purple", "aglianico", "montepulciano",
            "nero d avola", "negroamaro", "teroldego", "lagrein"),
    PINOTAGE(Pigment.DEEP, "Pinotage: deep purple-ruby", "pinotage"),
    MARSELAN(Pigment.DEEP, "Marselan: deep, dark purple", "marselan"),
    BAGA(Pigment.DEEP, "Baga: deep, dark ruby", "baga"),
    GRACIANO(Pigment.DEEP, "Graciano: deep, dark purple", "graciano"),
    MERLOT(Pigment.MEDIUM, "Merlot: medium-deep ruby-purple, a rounder hue", "merlot"),
    CABERNET_FRANC(Pigment.MEDIUM, "Cabernet Franc: medium-depth ruby, lighter than Cabernet Sauvignon; violet "
            + "glints only while young, garnet with oak or bottle age", "cabernet franc"),
    TEMPRANILLO(Pigment.MEDIUM, "Tempranillo: medium-deep ruby that moves to garnet with oak aging", "tempranillo",
            "tinta roriz", "tinto fino", "tinta del pais", "aragonez", "cencibel", "tinta de toro", "ull de llebre"),
    ZINFANDEL(Pigment.MEDIUM, "Zinfandel/Primitivo: ripe, medium-deep ruby to purple", "zinfandel", "primitivo"),
    SANGIOVESE(Pigment.MEDIUM, "Sangiovese: moderate pigment, ruby that turns garnet early", "sangiovese", "brunello",
            "prugnolo gentile", "morellino", "nielluccio"),
    CARIGNAN(Pigment.MEDIUM, "Carignan: medium-deep ruby", "carignan", "carinena", "mazuelo", "carignano", "samso"),
    BLAUFRANKISCH(Pigment.MEDIUM, "Blaufränkisch: medium-deep ruby with violet glints", "blaufrankisch", "lemberger",
            "kekfrankos"),
    ZWEIGELT(Pigment.MEDIUM, "Zweigelt: medium ruby-purple", "zweigelt"),
    MENCIA(Pigment.MEDIUM, "Mencía: medium ruby with violet glints", "mencia", "jaen"),
    SAINT_LAURENT(Pigment.MEDIUM, "St. Laurent: medium-deep ruby", "st laurent", "sankt laurent", "saint laurent"),
    PINOT_NOIR(Pigment.PALE, "Pinot Noir: no acylated anthocyanins and little pigment, a translucent ruby that turns "
            + "garnet early", "pinot noir", "pinot nero", "spatburgunder", "blauburgunder", "pinot negro"),
    NEBBIOLO(Pigment.PALE, "Nebbiolo: little, unstable pigment, pale garnet with an orange rim even when young",
            "nebbiolo", "spanna", "chiavennasca"),
    GRENACHE(Pigment.PALE, "Grenache: light to medium ruby that takes an orange tinge early", "grenache", "garnacha",
            "cannonau", "garnatxa", "garnacha tinta", "grenache noir"),
    GAMAY(Pigment.PALE, "Gamay: light, bright purple-ruby", "gamay"),
    CINSAULT(Pigment.PALE, "Cinsault: pale, light red", "cinsault", "cinsaut"),
    CRIOLLA(Pigment.PALE, "Criolla/País: pale, light red", "criolla", "criolla grande", "criolla chica", "pais",
            "listan prieto", "mission", "cereza"),
    PALE_RED(Pigment.PALE, "a light-skinned red grape: pale, translucent red", "pinot meunier", "meunier",
            "schwarzriesling", "trousseau", "bastardo", "poulsard", "ploussard", "frappato", "schiava", "vernatsch",
            "trollinger", "nerello mascalese", "corvina", "corvinone", "rondinella"),
    PINOT_GRIS(Pigment.PINK_SKINNED, "Pinot Gris/Grigio: pink-grey skins can leave a faint copper glint", "pinot gris",
            "pinot grigio", "grauburgunder", "rulander"),
    GEWURZTRAMINER(Pigment.PINK_SKINNED, "Gewürztraminer: pink-skinned, deep golden, at times with a copper tinge",
            "gewurztraminer", "traminer", "savagnin rose"),
    SAUVIGNON_BLANC(Pigment.CRISP, "Sauvignon Blanc: pale lemon with green glints", "sauvignon blanc", "sauvignon",
            "fume blanc"),
    ALBARINO(Pigment.CRISP, "Albariño: pale lemon-green", "albarino", "alvarinho"),
    RIESLING(Pigment.CRISP, "Riesling: pale lemon-green when young, turning gold with age", "riesling"),
    GRUNER_VELTLINER(Pigment.CRISP, "Grüner Veltliner: pale lemon-green", "gruner veltliner", "gruner"),
    VERDEJO(Pigment.CRISP, "Verdejo: pale straw with green tints", "verdejo"),
    TORRONTES(Pigment.CRISP, "Torrontés: pale straw with green or golden glints", "torrontes", "torrontes riojano",
            "torrontes sanjuanino", "torrontes mendocino"),
    CHENIN_BLANC(Pigment.CRISP, "Chenin Blanc: lemon to straw, golden when sweet or aged", "chenin blanc", "chenin",
            "steen"),
    GLERA(Pigment.CRISP, "Glera: very pale straw", "glera"),
    PALE_WHITE(Pigment.CRISP, "a pale, crisp white grape: pale lemon to straw", "vermentino", "rolle", "pigato",
            "melon de bourgogne", "assyrtiko", "furmint", "godello", "garganega", "picpoul", "trebbiano", "ugni blanc",
            "macabeo", "viura", "macabeu", "xarel lo", "xarello", "parellada", "arinto", "loureiro", "silvaner",
            "sylvaner", "muller thurgau", "rivaner", "pinot blanc", "pinot bianco", "weissburgunder", "aligote",
            "cortese", "verdicchio", "greco", "falanghina", "palomino", "listan blanco", "hondarrabi zuri"),
    PEDRO_XIMENEZ(Pigment.CRISP, "Pedro Ximénez: pale when dry, dark only when sun-dried for sweet wine",
            "pedro ximenez", "px"),
    CHARDONNAY(Pigment.FULL, "Chardonnay: lemon to straw, deepening to gold with oak or lees", "chardonnay"),
    VIOGNIER(Pigment.FULL, "Viognier: golden yellow", "viognier"),
    SEMILLON(Pigment.FULL, "Sémillon: pale lemon young, deepening to gold with age", "semillon"),
    MUSCAT(Pigment.FULL, "Muscat/Moscatel: straw to gold", "moscatel", "muscat", "moscato", "moscatel de alejandria",
            "muscadelle"),
    FULL_WHITE(Pigment.FULL, "a full-bodied white grape: straw to gold", "marsanne", "roussanne", "malvasia",
            "malvazija", "fiano", "grenache blanc", "garnacha blanca");

    /** The color a grape's skins give: four red steps and three white ones. */
    public enum Pigment {
        INKY, DEEP, MEDIUM, PALE, PINK_SKINNED, CRISP, FULL;

        public boolean red() {
            return ordinal() <= PALE.ordinal();
        }
    }

    private final Pigment pigment;
    private final String cue;
    private final List<String> names;

    GrapeColor(Pigment pigment, String cue, String... names) {
        this.pigment = pigment;
        this.cue = cue;
        this.names = List.of(names);
    }

    /** The grape a catalog name stands for, by exact normalized name ("Garnacha Tinta", "Spätburgunder"). */
    public static Optional<GrapeColor> of(String grape) {
        if (Objects.isNull(grape)) {
            return Optional.empty();
        }
        String name = TastingText.normalized(grape).replaceAll("[^a-z0-9]+", " ").strip();
        return Arrays.stream(values()).filter(color -> color.names.contains(name)).findFirst();
    }

    public Pigment pigment() {
        return pigment;
    }

    /** The cue for a still red or white wine. */
    public String cue() {
        return cue;
    }

    /** The cue for a rosé: skin-contact time decides its depth, within what the skins can give. */
    public String roseCue() {
        String grape = cue.substring(0, cue.indexOf(':'));
        return switch (pigment) {
            case INKY, DEEP -> grape + " rosé: pigment-rich skins, so depth follows skin-contact time, from pale pink "
                    + "with violet glints to deep raspberry, cherry or clarete";
            case MEDIUM -> grape + " rosé: depth follows skin-contact time, from pale salmon-pink to strawberry";
            case PALE -> grape + " rosé: light skins give pale copper, onion-skin, peach or salmon pinks";
            case PINK_SKINNED, CRISP, FULL -> cue;
        };
    }
}
