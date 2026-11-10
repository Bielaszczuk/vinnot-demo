package com.vinnot.ai.application.service;

/**
 * Wine-specific scoring, pairing, serving and aging rules shared by the profile and comparison prompts,
 * so both features avoid the same generic defaults.
 */
final class WineSpecificityGuidance {

    static final String CATALOG_GROUNDED_RULES = """
            Scores missing from the catalog: estimate them for this grape, place and style.
            Never fall back to habitual midpoints. Typical intensity ranges, adjusted by altitude, climate,
            oak, price tier and blend: Malbec: tannin 55-75, body 60-85, acidity 50-70;
            Cabernet Sauvignon: tannin 65-90, body 65-90; Cabernet Franc: tannin 55-75, acidity 55-75;
            Bonarda: tannin 40-60, body 50-70; Syrah: tannin 55-80, body 60-85; Merlot: tannin 40-60;
            Pinot Noir: tannin 20-40, body 30-55, acidity 60-80; Torrontés: acidity 50-70, tannin 0-5;
            Sauvignon Blanc: acidity 70-90, tannin 0-5; Chardonnay: acidity 50-75, body 45-75, tannin 0-5;
            sparkling: acidity 70-90, body 20-45, tannin 0-5; rosé: acidity 60-80, tannin 5-20.
            Avoid stock pairings that would fit any wine of the type, such as pasta with tomato sauce,
            blue cheese, plain roast lamb, grilled salmon or ceviche, unless this wine's traits justify them.
            Choose dishes that follow from its body, acidity, tannin, sweetness and aromas. A regional dish is
            optional: use it only when it suits this wine better than other options, and never default to the
            region's most emblematic dish (for Argentina, empanadas or asado) just because of the origin.
            Tie serving advice to the wine's structure: sparkling 6-8 °C, aromatic or young whites and rosés
            8-10 °C, oaked whites 10-13 °C, light reds 13-15 °C, structured reds 16-18 °C;
            no decanting for sparkling, whites, rosés or light reds; decant young structured reds 30-60 minutes;
            aging windows follow structure, tier and vintage instead of a fixed number of years.
            """;

    /** Production practices are facts a winery can check, so they come only from the catalog. */
    static final String PRODUCTION_FACTS_RULES = """

            # Production facts
            How a wine is made or farmed is a verifiable fact, not a style inference: fermentation or aging
            vessels (stainless steel, oak barrels, concrete, clay amphorae), yeasts, malolactic fermentation,
            skin contact, barrel times, harvest method and farming (organic, biodynamic, natural).
            State a production fact only when a catalog fact states it (Description, Winery profile, Style
            or Natural wine). When the catalog does not state it, never mention it and never say it is unknown:
            describe the sensory result instead (freshness, texture, oak character or its absence).
            """;

    private WineSpecificityGuidance() {
    }
}
