package com.vinnot.wine.domain.service;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Language profiles used to remove non-distinctive label vocabulary. These
 * words refine identity comparison; they never decide whether an image is a
 * wine label or prevent a language from being scanned.
 */
public enum WineLabelLanguageVocabulary {

    SPANISH(
            Set.of("de", "del", "el", "en", "la", "las", "los", "para", "por", "y"),
            Set.of("bodega", "bodegas", "familia", "finca", "hacienda",
                    "sociedad", "vina", "vinas", "vinedo", "vinedos")),
    ENGLISH(
            Set.of("and", "of", "the"),
            Set.of("cellar", "cellars", "company", "estate", "estates", "family",
                    "limited", "ltd", "vineyard", "vineyards", "winery", "wineries")),
    FRENCH(
            Set.of("au", "aux", "de", "des", "du", "et", "la", "le", "les"),
            Set.of("cave", "caves", "chateau", "domaine", "maison", "propriete",
                    "vignoble", "vignobles")),
    ITALIAN(
            Set.of("da", "dei", "degli", "del", "della", "delle", "di", "e",
                    "il", "la", "le", "lo"),
            Set.of("agricola", "azienda", "cantina", "fattoria", "podere", "tenuta",
                    "vigneti", "vinicola")),
    PORTUGUESE(
            Set.of("da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no",
                    "nos"),
            Set.of("adega", "companhia", "familia", "herdade", "quinta", "sociedade",
                    "vinicola")),
    GERMAN(
            Set.of("am", "das", "der", "die", "und", "vom", "von", "zum", "zur"),
            Set.of("kellerei", "schloss", "weingut", "winzer", "winzergenossenschaft"));

    private static final Set<String> GENERIC_WINE_TERMS = Set.of(
            "fine", "vin", "vinho", "vinhos", "vino", "vinos", "wein", "weine",
            "wine", "wines");
    /**
     * Quality, style and origin wording printed on many labels. A line made only of these words never
     * identifies a product on its own; searched alone it fills the candidate pool with unrelated producers.
     */
    private static final Set<String> GENERIC_DESIGNATIONS = Set.of(
            "blanc", "blanco", "blend", "bottled", "brut", "classic", "clasico", "clarete", "cosecha",
            "crianza", "dulce", "edicion", "edition", "especial", "espumante", "espumoso", "estate",
            "extra", "fino", "gran", "grand", "grown", "harvest", "joven", "late", "limitada",
            "limited", "metodo", "natural", "nature", "oak", "old", "organic", "premium", "red",
            "reserva", "reserve", "roble", "rosado", "rose", "seleccion", "selection", "single",
            "special", "tardia", "tinto", "tradicional", "varietal", "vine", "vines", "vineyard",
            "white");
    private static final Set<String> LEGAL_ENTITY_DESIGNATORS = Set.of(
            "gmbh", "inc", "lda", "limited", "llc", "ltd", "sa", "spa", "srl");

    private final Set<String> stopWords;
    private final Set<String> producerDesignators;

    WineLabelLanguageVocabulary(
            Set<String> stopWords, Set<String> producerDesignators) {
        this.stopWords = stopWords;
        this.producerDesignators = producerDesignators;
    }

    public static Set<String> allStopWords() {
        Set<String> terms = Arrays.stream(values())
                .flatMap(vocabulary -> vocabulary.stopWords.stream())
                .collect(Collectors.toSet());
        terms.addAll(GENERIC_WINE_TERMS);
        return Set.copyOf(terms);
    }

    public static Set<String> genericDesignations() {
        return GENERIC_DESIGNATIONS;
    }

    public static Set<String> allProducerDesignators() {
        Set<String> terms = Arrays.stream(values())
                .flatMap(vocabulary -> vocabulary.producerDesignators.stream())
                .collect(Collectors.toSet());
        terms.addAll(LEGAL_ENTITY_DESIGNATORS);
        return Set.copyOf(terms);
    }
}
