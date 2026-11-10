package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;

/** Empty structure to populate with a complete localized sommelier analysis. */
enum AiProfilePromptLocale {
    SPANISH("Spanish (Argentina)"),
    ENGLISH("English");

    private final String languageLabel;
    AiProfilePromptLocale(String languageLabel) {
        this.languageLabel = languageLabel;
    }

    static AiProfilePromptLocale from(AiContentLanguage language) {
        return language == AiContentLanguage.SPANISH ? SPANISH : ENGLISH;
    }

    String languageLabel() {
        return languageLabel;
    }

    String profileSchema() {
        return """
                {
                  "summary": "",
                  "visualAnalysis": {
                    "color": "",
                    "clarity": "",
                    "intensity": "",
                    "viscosity": ""
                  },
                  "aromaticProfile": {
                    "intensity": "",
                    "primaryAromas": [],
                    "secondaryAromas": [],
                    "bouquet": ""
                  },
                  "palateAnalysis": {
                    "sweetness": "",
                    "sweetnessScore": null,
                    "acidity": "",
                    "acidityScore": null,
                    "tannin": "",
                    "tanninScore": null,
                    "alcohol": "",
                    "body": "",
                    "bodyScore": null,
                    "texture": "",
                    "balance": ""
                  },
                  "flavorProfile": {
                    "primaryFlavors": [],
                    "secondaryFlavors": [],
                    "intensity": "",
                    "finish": ""
                  },
                  "foodPairings": {
                    "pairings": [],
                    "explanation": ""
                  },
                  "servingRecommendations": {
                    "temperature": "",
                    "glassware": "",
                    "decanting": "",
                    "agingPotential": ""
                  }
                """;
    }
}
