package com.vinnot.community.domain.model;

import com.vinnot.community.domain.model.TasteWheel.CatalogGrape;
import com.vinnot.community.domain.model.TasteWheel.Entry;
import com.vinnot.community.domain.model.TasteWheel.Kind;
import com.vinnot.community.domain.model.TasteWheel.RatedWine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #541 S15: the wheel shows one kind per view (grapes, styles, regions), each slice with its tone and rated wines;
 * grapes written in other scripts or cases are one slice.
 */
class TasteWheelTest {
    private static final String MENDOZA = "11111111-1111-1111-1111-111111111111";
    private static final String NEMEA = "22222222-2222-2222-2222-222222222222";

    @Test
    void entriesAreGrapesThenTypesThenRegionsAndARegionCarriesItsIdNameAndNoTone() {
        List<Entry> wheel = TasteWheel.of(List.of(
                wine("4", "RED", List.of("Malbec"), MENDOZA, "Mendoza"),
                wine("3", "WHITE", List.of("Chardonnay"), null, null)), List.of());

        assertThat(wheel).extracting(Entry::kind).containsExactly(Kind.GRAPE, Kind.GRAPE, Kind.TYPE, Kind.TYPE,
                Kind.REGION);
        assertThat(wheel.getLast()).isEqualTo(new Entry(Kind.REGION, MENDOZA, "Mendoza", score("4.00"), null, 1));
    }

    @Test
    void aTypeIsItsOwnToneAndAGrapeTakesTheDominantTypeOfTheWinesThatContainIt() {
        List<Entry> wheel = TasteWheel.of(List.of(
                wine("4", " red ", List.of("Pinot Noir"), null, null),
                wine("4", "RED", List.of("Pinot Noir"), null, null),
                wine("4", "SPARKLING", List.of("Pinot Noir", "Chardonnay"), null, null)), List.of());

        assertThat(entry(wheel, Kind.TYPE, "RED")).isEqualTo(new Entry(Kind.TYPE, "RED", "RED", score("4.00"), "RED", 2));
        assertThat(entry(wheel, Kind.GRAPE, "pinot noir").tone()).isEqualTo("RED");
        assertThat(entry(wheel, Kind.GRAPE, "chardonnay").tone()).isEqualTo("SPARKLING");
    }

    @Test
    void aToneTieGoesToTheCatalogCategoryOfTheGrapeElseToTheFirstTypeCode() {
        List<RatedWine> wines = List.of(
                wine("4", "ROSE", List.of("Syrah", "Viura", "Mystery"), null, null),
                wine("4", "RED", List.of("Syrah", "Mystery"), null, null),
                wine("4", "WHITE", List.of("Viura"), null, null),
                wine("4", "SPARKLING", List.of("Mystery"), null, null));
        List<CatalogGrape> catalog = List.of(new CatalogGrape("Syrah", "Sirah", "RED"),
                new CatalogGrape("Macabeo", "Viura", "WHITE"), new CatalogGrape("Mystery", null, null));

        List<Entry> wheel = TasteWheel.of(wines, catalog);

        assertThat(entry(wheel, Kind.GRAPE, "syrah").tone()).isEqualTo("RED");
        assertThat(entry(wheel, Kind.GRAPE, "viura").tone()).isEqualTo("WHITE");
        assertThat(entry(wheel, Kind.GRAPE, "mystery").tone()).isEqualTo("RED");
        assertThat(entry(TasteWheel.of(wines, List.of()), Kind.GRAPE, "syrah").tone()).isEqualTo("RED");
        assertThat(entry(TasteWheel.of(wines, List.of()), Kind.GRAPE, "viura").tone()).isEqualTo("ROSE");
        assertThat(entry(TasteWheel.of(wines, List.of(new CatalogGrape("Viura", null, "OTHER"))), Kind.GRAPE, "viura")
                .tone()).isEqualTo("ROSE");
    }

    @Test
    void greekAndLatinSpellingsOfAGrapeAreOneEntryWhoseScoreWeighsEveryRatedWine() {
        List<Entry> wheel = TasteWheel.of(List.of(
                wine("5", "RED", List.of("Agiorgitiko"), NEMEA, "Nemea"),
                wine("4", "RED", List.of("ΑΓΙΩΡΓΙΤΙΚΟ"), NEMEA, "Nemea"),
                wine("4", "RED", List.of("Αγιωργίτικο"), null, null),
                wine("3", "RED", List.of("Aγιωργιτικο"), null, null),
                wine("4.5", "WHITE", List.of("Assyrtiko"), null, null),
                wine("3.5", "WHITE", List.of("ασύρτικο"), null, null)), List.of());

        assertThat(wheel).filteredOn(item -> item.kind() == Kind.GRAPE).containsExactly(
                new Entry(Kind.GRAPE, "agiorgitiko", "Agiorgitiko", score("4.00"), "RED", 4),
                new Entry(Kind.GRAPE, "assyrtiko", "Assyrtiko", score("4.00"), "WHITE", 2));
    }

    @Test
    void theLabelIsTheMostFrequentLatinSpellingElseTheTitleCasedRomanisation() {
        List<Entry> wheel = TasteWheel.of(List.of(
                wine("4", "RED", List.of("MALBEC"), null, null),
                wine("4", "RED", List.of("Malbec"), null, null),
                wine("4", "RED", List.of("Malbec"), null, null),
                wine("4", "RED", List.of("malbec"), null, null),
                wine("4", "RED", List.of("Cot"), null, null),
                wine("4", "RED", List.of("cot"), null, null),
                wine("4", "WHITE", List.of("Ασύρτικο"), null, null),
                wine("4", "WHITE", List.of("ΑΣΥΡΤΙΚΟ"), null, null),
                wine("4", "WHITE", List.of("ασύρτικο"), null, null)), List.of());

        assertThat(entry(wheel, Kind.GRAPE, "malbec").label()).isEqualTo("Malbec");
        assertThat(entry(wheel, Kind.GRAPE, "cot").label()).isEqualTo("Cot");
        assertThat(entry(wheel, Kind.GRAPE, "asyrtiko").label()).isEqualTo("Asyrtiko");
    }

    @Test
    void ratedWinesCountEveryRatedWineOnceEvenWhenTheWineListsTheGrapeTwice() {
        List<Entry> wheel = TasteWheel.of(List.of(
                wine("4", "RED", List.of("Malbec", "MALBEC", "Málbec"), MENDOZA, "Mendoza"),
                wine("3", "RED", List.of("Malbec", "Bonarda"), MENDOZA, "Mendoza"),
                wine("2", "WHITE", List.of(), MENDOZA, "Mendoza")), List.of());

        assertThat(entry(wheel, Kind.GRAPE, "malbec").ratedWines()).isEqualTo(2);
        assertThat(entry(wheel, Kind.GRAPE, "malbec").score()).isEqualTo(score("3.50"));
        assertThat(entry(wheel, Kind.TYPE, "RED").ratedWines()).isEqualTo(2);
        assertThat(entry(wheel, Kind.REGION, MENDOZA).ratedWines()).isEqualTo(3);
        assertThat(entry(wheel, Kind.REGION, MENDOZA).score()).isEqualTo(score("3.00"));
    }

    @Test
    void eachKindKeepsItsEightBestEntriesByScoreThenRatedWinesThenLabel() {
        List<RatedWine> wines = new ArrayList<>();
        for (int index = 1; index <= 10; index++) {
            wines.add(wine("3", "RED", List.of("Grape " + (char) ('A' + index)), "region-" + index, "Region " + index));
        }
        wines.add(wine("5", "RED", List.of("Grape K"), "region-10", "Region 10"));
        wines.add(wine("3", "RED", List.of("Grape C"), "region-2", "Region 2"));

        List<Entry> wheel = TasteWheel.of(wines, List.of());

        assertThat(wheel).filteredOn(item -> item.kind() == Kind.GRAPE).extracting(Entry::label)
                .containsExactly("Grape K", "Grape C", "Grape B", "Grape D", "Grape E", "Grape F", "Grape G", "Grape H");
        assertThat(wheel).filteredOn(item -> item.kind() == Kind.REGION).extracting(Entry::label)
                .containsExactly("Region 10", "Region 2", "Region 1", "Region 3", "Region 4", "Region 5", "Region 6",
                        "Region 7");
        assertThat(wheel).filteredOn(item -> item.kind() == Kind.TYPE).hasSize(1);
    }

    @Test
    void blankTypesAndGrapesAreSkippedAGrapeWithoutTypedWinesHasNoToneAndNoRatedWinesGiveAnEmptyWheel() {
        assertThat(TasteWheel.of(List.of(), List.of())).isEmpty();
        assertThat(TasteWheel.of(List.of(wine("4", " ", List.of(" "), null, null)), List.of())).isEmpty();
        List<Entry> untyped = TasteWheel.of(List.of(new RatedWine(new BigDecimal("4"), null, null, null, null),
                wine("4", " ", List.of("Malbec"), null, null)), List.of());
        assertThat(untyped).containsExactly(new Entry(Kind.GRAPE, "malbec", "Malbec", score("4.00"), null, 1));
    }

    private static Entry entry(List<Entry> wheel, Kind kind, String value) {
        return wheel.stream().filter(item -> item.kind() == kind && item.value().equals(value)).findFirst()
                .orElseThrow();
    }

    private static RatedWine wine(String rating, String type, List<String> grapes, String regionId, String region) {
        return new RatedWine(new BigDecimal(rating), type, grapes, regionId, region);
    }

    private static BigDecimal score(String value) {
        return new BigDecimal(value);
    }
}
