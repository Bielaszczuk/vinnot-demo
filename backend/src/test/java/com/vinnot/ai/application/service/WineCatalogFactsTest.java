package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.model.WineColorEvidence;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.TasteProfile;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineCatalogFactsTest {

    @Test
    void listsEveryDistinguishingFactInPromptOrderPreferringTheWineOrigin() {
        UUID wineryId = UUID.randomUUID();
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Single Vineyard").wineryId(wineryId)
                .wineType(WineType.RED).vintage(2021).style(" Seco ").regionName("Gualtallary")
                .countryName("Argentina").descriptionEs("Fruta negra").descriptionEn("Black fruit")
                .grapes(List.of("Malbec", "Cabernet Franc")).alcoholContent(new BigDecimal("14.0"))
                .priceRange(PriceRange.of(new BigDecimal("40.00"), new BigDecimal("55")))
                .servingTemperature(ServingTemperature.of(15, 17)).natural(true).foodPairing("Hongos")
                .tasteProfile(TasteProfile.of(60, 70, 80, 5))
                .rating(Rating.of(new BigDecimal("4.3"), 812)).build();
        Winery winery = Winery.builder().id(wineryId).name("Producer").regionName("Mendoza")
                .countryName("Chile").subregion(" Tupungato ").establishedYear(1998)
                .descriptionEs("p".repeat(500)).build();

        assertThat(WineCatalogFacts.of(wine, winery)).extracting(WineCatalogFacts.Fact::render).containsExactly(
                "Name: Single Vineyard", "Type: red", "Vintage: 2021", "Winery: Producer", "Region: Gualtallary",
                "Country: Argentina", "Winery subregion: Tupungato", "Winery founded: 1998",
                "Winery profile: " + "p".repeat(400) + "…", "Style: Seco", "Description (es): Fruta negra",
                "Description (en): Black fruit", "Grapes: Malbec, Cabernet Franc", "Alcohol: 14.0%",
                "Catalog price range: 40-55", "Catalog serving temperature: 15-17 °C", "Natural wine: yes",
                "Known food pairings: Hongos", "Acidity score: 60/100", "Tannin score: 70/100",
                "Body score: 80/100", "Sweetness score: 5/100");
        assertThat(WineCatalogFacts.hasCatalogPrice(wine)).isTrue();
    }

    @Test
    void leavesTheVinnotUserRatingOutOfEveryPrompt() {
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Rated").wineType(WineType.RED).vintage(2020)
                .tasteProfile(TasteProfile.of(60, 70, 80, 5))
                .rating(Rating.of(new BigDecimal("5"), 2)).build();

        assertThat(WineCatalogFacts.of(wine, null)).extracting(WineCatalogFacts.Fact::render)
                .contains("Name: Rated", "Vintage: 2020", "Sweetness score: 5/100")
                .noneMatch(fact -> fact.toLowerCase().contains("rating"));
    }

    @Test
    void keepsTheAlwaysPresentLabelsBlankAndOmitsUnknownOptionalFacts() {
        Wine wine = Wine.create("Sparse", null, WineType.WHITE, UUID.randomUUID());

        assertThat(WineCatalogFacts.of(wine, null)).extracting(WineCatalogFacts.Fact::render).containsExactly(
                "Name: Sparse", "Type: white", "Winery: ", "Region: ", "Country: ");
        assertThat(WineCatalogFacts.hasCatalogPrice(wine)).isFalse();
    }

    @Test
    void handsTheColorFactsWithTheWineOriginFirstAndTheWineryAsFallback() {
        UUID wineryId = UUID.randomUUID();
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Altura").wineryId(wineryId).wineType(WineType.RED)
                .vintage(2021).style("Roble").grapes(List.of("Malbec")).tasteProfile(TasteProfile.of(60, 70, 80, 5))
                .build();
        Winery winery = Winery.builder().id(wineryId).name("Producer").regionName("Mendoza").countryName("Argentina")
                .subregion("Tupungato").build();

        assertThat(WineCatalogFacts.colorFacts(wine, winery)).isEqualTo(new WineColorEvidence.Facts(
                "Altura", "Roble", "RED", List.of("Malbec"), "Mendoza", "Tupungato", "Argentina", 2021, 5));
        assertThat(WineCatalogFacts.colorFacts(Wine.create("Bare", null, WineType.WHITE, null), null))
                .isEqualTo(new WineColorEvidence.Facts("Bare", null, "WHITE", List.of(), "", null, "", null, null));
    }
}
