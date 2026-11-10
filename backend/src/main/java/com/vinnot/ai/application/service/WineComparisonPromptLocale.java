package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;

import java.util.List;
import java.util.stream.Collectors;

/** Localized output skeleton; instructions never appear as sample narrative content. */
enum WineComparisonPromptLocale {
    SPANISH(List.of(new Attribute("body", "Cuerpo"), new Attribute("tannin", "Taninos"),
            new Attribute("acidity", "Acidez"), new Attribute("sweetness", "Dulzor"),
            new Attribute("alcohol", "Alcohol"), new Attribute("fruitIntensity", "Intensidad Frutal"),
            new Attribute("complexity", "Complejidad"), new Attribute("finish", "Final"))),
    ENGLISH(List.of(new Attribute("body", "Body"), new Attribute("tannin", "Tannins"),
            new Attribute("acidity", "Acidity"), new Attribute("sweetness", "Sweetness"),
            new Attribute("alcohol", "Alcohol"), new Attribute("fruitIntensity", "Fruit Intensity"),
            new Attribute("complexity", "Complexity"), new Attribute("finish", "Finish")));

    /** Stable machine key plus the localized display name of one comparison axis. */
    record Attribute(String key, String name) {
    }

    private static final String TASTING_NOTE = """
            {"identity": "", "appearance": "", "nose": "", "palate": "", "finish": ""}""";
    private static final String PAIRING = """
            {"dish": "", "why": ""}""";
    private static final String SERVING = """
            {"temperature": "", "decanting": ""}""";

    private final List<Attribute> attributes;

    WineComparisonPromptLocale(List<Attribute> attributes) {
        this.attributes = attributes;
    }

    List<Attribute> attributes() {
        return attributes;
    }

    String comparisonSchema() {
        String rows = attributes.stream().map(attribute -> """
                {"key": "%s", "name": "%s", "wineAValue": "", "wineBValue": "",
                 "wineAScore": null, "wineBScore": null}
                """.formatted(attribute.key(), attribute.name()).strip()).collect(Collectors.joining(",\n"));
        return """
                {
                  "summary": "",
                  "keyDifferences": [],
                  "similarities": [],
                  "attributeComparison": {"attributes": [%s]},
                  "tastingNotes": {"wineA": %s, "wineB": %s},
                  "chooseIf": [{"pick": "A", "situation": "", "why": ""}, {"pick": "B", "situation": "", "why": ""}],
                  "pairings": {"wineA": [%s], "wineB": [%s], "shared": %s},
                  "serving": {"wineA": %s, "wineB": %s},
                  "aging": {"wineA": "", "wineB": ""},
                  "value": null,
                  "bestFor": {"wineA": [], "wineB": []},
                  "recommendationWineA": "",
                  "recommendationWineB": "",
                  "recommendation": ""
                }
                """.formatted(rows, TASTING_NOTE, TASTING_NOTE, PAIRING, PAIRING, PAIRING, SERVING, SERVING);
    }

    static WineComparisonPromptLocale from(AiContentLanguage language) {
        return language == AiContentLanguage.ENGLISH ? ENGLISH : SPANISH;
    }
}
