package com.vinnot.ai.domain.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WineColorEvidenceTest {

    private static final int YEAR = 2026;

    private static List<String> cues(String name, String type, List<String> grapes, String region, String country,
                                     Integer vintage) {
        return WineColorEvidence.cues(new WineColorEvidence.Facts(name, null, type, grapes, region, null, country,
                vintage, null), YEAR);
    }

    @Test
    void groundsAMalbecInItsGrapePlaceAndAge() {
        List<String> salta = cues("Malbec", "RED", List.of("Malbec"), "Cafayate Valley", "Argentina", 2023);

        assertThat(salta).containsExactly(
                "Grape: Malbec: anthocyanin-rich skins, deep and violet-purple while young",
                "Place: " + WineGrowingArea.CALCHAQUI_SALTA.cue(WineColorEvidence.Family.RED),
                "Age: vintage 2023, about 3 years old; violet giving way to ruby, the rim starting to lighten");
    }

    @Test
    void givesMalbecsFromSaltaMendozaAndPatagoniaDifferentPlaceCues() {
        String salta = cues("Malbec", "red", List.of("Malbec"), "Salta", "Argentina", null).get(1);
        String uco = cues("Malbec", "red", List.of("Malbec"), "Gualtallary", "Argentina", null).get(1);
        String lujan = cues("Malbec", "red", List.of("Malbec"), "Agrelo", "Argentina", null).get(1);
        String patagonia = cues("Malbec", "red", List.of("Malbec"), "Neuquén", "Argentina", null).get(1);

        assertThat(salta).contains("inky, near-opaque core");
        assertThat(uco).contains("Uco Valley", "lively violet-purple rim");
        assertThat(lujan).contains("Luján de Cuyo", "black cherry or plum");
        assertThat(patagonia).contains("Neuquén", "translucent ruby");
        assertThat(List.of(salta, uco, lujan, patagonia)).doesNotHaveDuplicates();
    }

    @Test
    void namesNoTerroirForAnUnknownPlaceAndNoAgeWithoutAVintage() {
        List<String> cues = cues("Malbec", "RED", List.of("Malbec"), "Wine of Argentina", "Argentina", null);

        assertThat(cues).containsExactly("Grape: Malbec: anthocyanin-rich skins, deep and violet-purple while young");
    }

    @Test
    void ignoresAVintageInTheFutureAndUnknownGrapes() {
        assertThat(cues("Cuvée", "RED", List.of("Xyz"), null, null, 2030)).isEmpty();
        assertThat(WineColorEvidence.cues(new WineColorEvidence.Facts(null, null, null, null, null, null, null, null,
                null), YEAR)).isEmpty();
    }

    @Test
    void readsABlendAsTheMixOfItsGrapes() {
        List<String> cues = cues("Blend", "RED", List.of("Malbec", "Cabernet Franc", "Malbec"), null, null, null);

        assertThat(cues).containsExactly(
                "Grape: Malbec: anthocyanin-rich skins, deep and violet-purple while young",
                "Grape: Cabernet Franc: medium-depth ruby, lighter than Cabernet Sauvignon; violet glints only while "
                        + "young, garnet with oak or bottle age",
                "Blend: the color mixes these grapes; even a small share of a deeply pigmented one darkens it");
    }

    @Test
    void agesEachFamilyAlongItsOwnScale() {
        assertThat(cues("Old", "RED", List.of(), null, null, 2005))
                .containsExactly("Age: vintage 2005, about 21 years old; garnet to brick or tawny, a lighter core and "
                        + "an orange rim");
        assertThat(cues("R", "RED", List.of(), null, null, 2025)).first().asString()
                .contains("about 1 year old; purple and violet still lead");
        assertThat(cues("R", "RED", List.of(), null, null, 2018)).first().asString().contains("ruby moving to garnet");
        assertThat(cues("W", "WHITE", List.of(), null, null, 2025)).first().asString().contains("green or lemon tints");
        assertThat(cues("W", "WHITE", List.of(), null, null, 2022)).first().asString().contains("straw to light gold");
        assertThat(cues("W", "WHITE", List.of(), null, null, 2018)).first().asString().endsWith("; gold");
        assertThat(cues("W", "WHITE", List.of(), null, null, 2012)).first().asString().contains("topaz, amber or brown");
        assertThat(cues("P", "ROSE", List.of(), null, null, 2026)).first().asString().contains("fresh, vivid pink");
        assertThat(cues("P", "ROSE", List.of(), null, null, 2024)).first().asString().contains("salmon or copper");
        assertThat(cues("P", "ROSE", List.of(), null, null, 2020)).first().asString().contains("onion skin or orange");
    }

    @Test
    void describesRosesBySkinContactWithinWhatTheGrapeCanGive() {
        assertThat(cues("Rosé", "ROSE", List.of("Malbec"), null, null, null)).first().asString()
                .contains("Malbec rosé", "skin-contact time", "clarete");
        assertThat(cues("Rosé", "ROSE", List.of("Merlot"), null, null, null)).first().asString()
                .contains("pale salmon-pink to strawberry");
        List<String> provence = cues("Rosé", "ROSE", List.of("Grenache"), "Côtes de Provence", "Francia", null);
        assertThat(provence.get(0)).contains("Grenache rosé: light skins give pale copper, onion-skin, peach");
        assertThat(provence.get(1)).contains("peach, melon, mango");
        assertThat(cues("Rosado", "ROSE", List.of("Pinot Gris"), null, null, null)).first().asString()
                .contains("faint copper glint");
        assertThat(cues("Clarete de Sangrado", "ROSE", List.of(), null, null, null))
                .containsExactly("Style: bled (saignée) or longer skin contact, a deeper pink toward clarete");
        assertThat(cues("Vin Gris", "ROSE", List.of(), null, null, null))
                .containsExactly("Style: a gris or blush rosé, pressed straight away, very pale");
    }

    @Test
    void readsSparklingMethodAndGrapesFromTheName() {
        assertThat(cues("Blanc de Blancs Brut", "SPARKLING", List.of("Chardonnay"), "Champagne", "France", null))
                .contains("Style: Blanc de Blancs, white grapes only, pale lemon with green glints",
                        "Style: bottle-fermented sparkling; long aging before and after disgorging brings golden tints");
        assertThat(cues("Blanc de Noirs", "SPARKLING", List.of("Pinot Noir"), null, null, null))
                .contains("Grape: Pinot Noir: no acylated anthocyanins and little pigment, a translucent ruby that "
                                + "turns garnet early",
                        "Style: Blanc de Noirs, a white from red grapes that may keep a faint copper or pink tinge");
        assertThat(cues("Brut Rosé", "SPARKLING", List.of("Pinot Noir"), null, null, null)).first().asString()
                .contains("Pinot Noir rosé");
        assertThat(cues("Método Tradicional Extra Brut", "SPARKLING", List.of(), null, null, null)).first().asString()
                .contains("bottle-fermented");
        assertThat(cues("Prosecco Brut", "SPARKLING", List.of("Glera"), "Prosecco", "Italia", null))
                .contains("Style: tank-method sparkling released young, pale straw to lemon");
        assertThat(cues("Moscato d'Asti", "SPARKLING", List.of(), null, null, null))
                .containsExactly("Style: tank-method sparkling released young, pale straw to lemon");
        assertThat(cues("Pet Nat", "SPARKLING", List.of(), null, null, null))
                .containsExactly("Style: ancestral-method sparkling (pet-nat), often unfiltered and slightly hazy");
        assertThat(cues("Lambrusco Secco", "SPARKLING", List.of("Sangiovese"), null, null, 2025)).last().asString()
                .contains("purple and violet still lead");
    }

    @Test
    void readsPortSherryAndMadeiraStyles() {
        assertThat(cues("10 Years Old Tawny Port", "FORTIFIED", List.of("Touriga Nacional"), "Porto", "Portugal", null))
                .last().asString().contains("tawny Port");
        assertThat(cues("Porto Blanco", "FORTIFIED", List.of(), null, null, null)).last().asString()
                .contains("white Port");
        assertThat(cues("Late Bottled Vintage", "FORTIFIED", List.of(), "Douro", "Portugal", null)).last().asString()
                .contains("Vintage or LBV Port");
        assertThat(cues("Reserve Ruby", "FORTIFIED", List.of(), "Porto", "Portugal", null)).last().asString()
                .contains("ruby Port");
        assertThat(cues("Oloroso", "FORTIFIED", List.of("Palomino"), "Jerez-Xérès-Sherry", "España", null))
                .last().asString().contains("amber to mahogany");
        assertThat(cues("Amontillado", "FORTIFIED", List.of(), null, null, null)).last().asString()
                .contains("light brown");
        assertThat(cues("Fino", "FORTIFIED", List.of(), null, null, null)).last().asString().contains("pale straw");
        assertThat(cues("Pedro Ximénez", "DESSERT", List.of("Pedro Ximénez"), "Montilla-Moriles", "España", null))
                .last().asString().contains("very dark ebony or mahogany");
        assertThat(cues("Sherry", "FORTIFIED", List.of(), null, null, null)).isEmpty();
        assertThat(cues("Malmsey", "FORTIFIED", List.of(), null, null, null)).last().asString().contains("Madeira");
        assertThat(cues("Rich", "FORTIFIED", List.of(), "Madeira", "Portugal", null)).last().asString()
                .contains("heated and oxidative aging");
        assertThat(cues("Moscatel Licoroso", "FORTIFIED", List.of(), null, null, null)).isEmpty();
    }

    @Test
    void readsSweetOrangeAndOakStylesForTheirFamily() {
        assertThat(cues("Late Harvest", "DESSERT", List.of("Torrontés"), null, null, null))
                .contains("Style: late-harvest or sweet: very ripe, dried or botrytised grapes and residual sugar give a "
                        + "deeper gold, topaz or amber");
        assertThat(cues("Dulce", "DESSERT", List.of("Malbec"), null, null, null)).last().asString()
                .isEqualTo("Style: late-harvest or sweet, from very ripe or dried grapes, deep and concentrated");
        assertThat(WineColorEvidence.cues(new WineColorEvidence.Facts("Dulce", null, "WHITE", List.of(), null, null,
                null, null, 72), YEAR)).containsExactly("Sweetness 72/100 in the catalog: residual sugar from riper or "
                + "late-picked grapes goes with a deeper gold");
        assertThat(WineColorEvidence.cues(new WineColorEvidence.Facts("Seco", null, "WHITE", List.of(), null, null,
                null, null, 10), YEAR)).isEmpty();
        assertThat(cues("Torrontés Orange", "WHITE", List.of("Torrontés"), null, null, null)).last().asString()
                .contains("skin-contact white (orange wine)");
        assertThat(WineColorEvidence.cues(new WineColorEvidence.Facts("Chardonnay", "Roble", "WHITE",
                List.of("Chardonnay"), null, null, null, null, null), YEAR)).last().asString()
                .contains("deepens a white toward gold");
        assertThat(cues("Malbec Oak", "RED", List.of(), null, null, null))
                .containsExactly("Style: the name states oak aging, which turns the violet to ruby and garnet sooner");
        assertThat(cues("Malbec Sin Madera", "RED", List.of(), null, null, null))
                .containsExactly("Style: the name states no oak, so the hue stays fresher and paler");
        assertThat(cues("Beaujolais Nouveau", "RED", List.of("Gamay"), "Beaujolais", "Francia", null)).last().asString()
                .contains("released young");
        assertThat(cues("Amarone della Valpolicella", "RED", List.of(), null, null, null))
                .containsExactly("Style: dried-grape wine (amarone, recioto, ripasso or passito), deep and concentrated");
    }

    @Test
    void readsAgingTermsOnlyWhereTheLawDefinesThem() {
        assertThat(cues("Gran Reserva", "RED", List.of(), null, "España", null)).containsExactly(
                "Aging: Gran Reserva (in Rioja at least 5 years, 2 in oak), an evolved garnet with a brick rim");
        assertThat(cues("Gran Reserva Blanco", "WHITE", List.of(), null, "España", null)).first().asString()
                .contains("4 years");
        assertThat(cues("Reserva", "RED", List.of(), null, "Spain", null)).first().asString()
                .contains("3 years, 1 in oak");
        assertThat(cues("Reserva", "WHITE", List.of(), null, "España", null)).first().asString()
                .contains("2 years, 6 months in oak");
        assertThat(cues("Crianza", "RED", List.of(), null, "España", null)).first().asString()
                .contains("2 years, 1 in oak");
        assertThat(cues("Crianza", "WHITE", List.of(), null, "España", null)).first().asString()
                .contains("straw with golden tints");
        assertThat(cues("Joven", "RED", List.of(), null, "España", null)).first().asString()
                .contains("released young");
        assertThat(cues("Gran Reserva Malbec", "RED", List.of(), "Mendoza", "Argentina", null)).last().asString()
                .contains("at least 18 months");
        assertThat(cues("Reserva Malbec", "RED", List.of(), "Wine of Argentina", "Argentina", null))
                .containsExactly("Aging: Reserva (Argentine rule: at least 12 months of aging for reds, 6 for whites), "
                        + "a touch more evolved than a young release");
        assertThat(cues("Reserva", "RED", List.of(), null, "Chile", null)).isEmpty();
    }

    @Test
    void givesYoungAndOakCuesThatFitTheFamily() {
        assertThat(cues("Malbec Joven", "RED", List.of("Malbec"), null, null, null))
                .anyMatch(cue -> cue.contains("bright violet-purple"));
        assertThat(cues("Verdejo Joven", "WHITE", List.of("Verdejo"), null, null, null))
                .noneMatch(cue -> cue.contains("violet")).anyMatch(cue -> cue.contains("released young"));
        assertThat(cues("Rosado Joven", "ROSE", List.of("Garnacha"), null, null, null))
                .noneMatch(cue -> cue.contains("violet-purple")).anyMatch(cue -> cue.contains("released young"));
        assertThat(cues("Rosé Barrel Fermented", "ROSE", List.of("Pinot Noir"), null, null, null))
                .noneMatch(cue -> cue.contains("ruby and garnet")).anyMatch(cue -> cue.contains("oak"));
    }

    @Test
    void readsNobleAndAmberOnlyWhenTheyNameTheStyle() {
        assertThat(cues("Noble Malbec", "RED", List.of("Malbec"), null, null, null))
                .noneMatch(cue -> cue.contains("late-harvest"));
        assertThat(cues("Ámbar Torrontés", "WHITE", List.of("Torrontés"), null, null, null))
                .noneMatch(cue -> cue.contains("orange wine"));
        assertThat(cues("Riesling Noble Rot", "WHITE", List.of("Riesling"), null, null, null))
                .anyMatch(cue -> cue.contains("late-harvest"));
    }
}
