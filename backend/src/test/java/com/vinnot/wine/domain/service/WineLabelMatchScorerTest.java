package com.vinnot.wine.domain.service;

import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineLabelMatchScorerTest {

    private final WineLabelMatchScorer scorer = new WineLabelMatchScorer();

    @ParameterizedTest
    @ValueSource(strings = {"Catena", "Casa Sur", "Valle Claro"})
    void equallyScoredProducerAliasesPreferTheObservedNameBeforeCatalogId(String producer) {
        var plain = Wine.builder().id(new UUID(0, 2)).name("Malbec")
                .wineType(WineType.RED).grapes(List.of("Malbec")).build();
        var extended = Wine.builder().id(new UUID(0, 1)).name("Malbec")
                .wineType(WineType.RED).grapes(List.of("Malbec")).build();
        var candidates = List.of(new WineLabelCandidate(extended, producer + " Viñas"),
                new WineLabelCandidate(plain, producer));
        var observedPlain = label(producer, "Malbec", "Malbec", null, "RED");
        var ranked = scorer.rank(observedPlain, candidates);
        assertThat(ranked).hasSize(2);
        assertThat(ranked.getFirst().score()).isEqualTo(ranked.getLast().score());
        assertThat(ranked.getFirst().candidate().wine()).isSameAs(plain);
        var observedExtended = label(producer + " Viñas", "Malbec", "Malbec", null, "RED");
        assertThat(scorer.rank(observedExtended, candidates).getFirst().candidate().wine())
                .isSameAs(extended);
    }

    @Test
    void organicTranslationAndAltitudeDoNotReplaceTheCommercialIdentity() {
        var expected = wine("Gran Bousquet Organic Cabernet Sauvignon", null,
                WineType.RED, List.of("Cabernet Sauvignon"));
        var sibling = wine("Gran Bousquet Organic Malbec", null, WineType.RED, List.of("Malbec"));
        var unrelated = wine("Gaia Red Blend", null, WineType.RED, List.of("Malbec"));
        var label = labelWithEvidence("Domaine Bousquet", "Gran Cabernet Sauvignon", "Cabernet Sauvignon",
                2018, "RED", "Domaine Bousquet Gran Cabernet Sauvignon",
                List.of("DOMAINE BOUSQUET", "Naturally Elegant Wines", "GRAN CABERNET SAUVIGNON",
                        "VINO ORGANICO", "2018", "GUALTALLARY", "TUPUNGATO", "1200 MTS. ALTITUD", "BOT. N° 01487"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(expected, "Domaine Bousquet"),
                new WineLabelCandidate(sibling, "Domaine Bousquet"), new WineLabelCandidate(unrelated, "Domaine Bousquet")));
        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).as("Ranking: %s", ranked).isTrue();
        var incomplete = labelWithEvidence("Domaine Bousquet", "Gran Cabernet Sauvignon", "Cabernet Sauvignon",
                2018, "RED", "Domaine Bousquet Gran Cabernet Sauvignon", List.of("GRAN CABERNET SAUVIGNON"));
        assertThat(scorer.isExact(incomplete, new RankedWineLabelCandidate(
                new WineLabelCandidate(expected, "Domaine Bousquet"), 1.0))).isFalse();
    }

    @Test
    void longNamesCannotHideDifferentCommercialMarksDuringDuplicateConsolidation() {
        var plain = wine("Estate Single Vineyard Old Vines Valley Selection Cabernet Sauvignon", null,
                WineType.RED, List.of("Cabernet Sauvignon"));
        var marked = wine("[+] Estate Single Vineyard Old Vines Valley Selection Cabernet Sauvignon", null,
                WineType.RED, List.of("Cabernet Sauvignon"));
        var label = label("Casa Sur", plain.getName(), "Cabernet Sauvignon", null, "RED");
        var first = new RankedWineLabelCandidate(new WineLabelCandidate(plain, "Casa Sur"), 1.0);
        var second = new RankedWineLabelCandidate(new WineLabelCandidate(marked, "Casa Sur"), 0.96);
        assertThat(scorer.representsSameCatalogIdentity(label, first, second)).isFalse();
        assertThat(scorer.isUnobservedSymbolVariant(label, first.candidate(), second.candidate())).isTrue();
    }

    @Test
    void aPartialProducerNameCannotEraseTheRestOfAnExplicitBrand() {
        var wine = wine("Chardonnay", null, WineType.WHITE, List.of("Chardonnay"));
        var label = labelWithEvidence("Ember Harbor", "Chardonnay", "Chardonnay", 2023, "WHITE",
                "Ember Harbor Chardonnay", List.of("EMBER HARBOR", "CHARDONNAY", "2023"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(wine, "Ember")));
        assertThat(ranked).allMatch(candidate -> !scorer.isExact(label, candidate));
        assertThat(scorer.isExact(label, new RankedWineLabelCandidate(
                new WineLabelCandidate(wine, "Ember"), 1.0))).isFalse();
    }

    @Test
    void visibleCuveeOutranksGenericStyleWordsOnAnotherWineFromTheSameProducer() {
        var expected = Wine.builder().id(UUID.randomUUID())
                .name("'L'Incandescente' Rosé Extra Brut Champagen Premier Cru")
                .wineType(WineType.SPARKLING).grapes(List.of()).regionName("Champagne Premier Cru").build();
        var sibling = Wine.builder().id(UUID.randomUUID()).name("Rosé Brut Champagne Premier Cru")
                .wineType(WineType.SPARKLING).grapes(List.of()).regionName("Champagne Premier Cru").build();
        var label = labelWithEvidence("Crucifix père & fils", "L'Incandescente Rosé", null, null, "ROSE",
                "Crucifix père & fils L'Incandescente Rosé",
                List.of("Crucifix", "père & fils", "CHAMPAGNE", "Avenay Val D'Or - Premier Cru",
                        "L'Incandescente", "Rosé", "Artisan Vigneron"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(sibling, "Crucifix"),
                new WineLabelCandidate(expected, "Crucifix")));
        assertThat(ranked.getFirst().candidate().wine()).as("Ranking: %s", ranked).isSameAs(expected);
        assertThat(ranked.getFirst().score()).isGreaterThan(ranked.get(1).score());
        assertThat(scorer.isExact(label, ranked.get(1))).isFalse();
    }

    @Test
    void detachedCommercialLineRemainsDecisiveWhenStructuredNameOmitsIt() {
        var expected = wine("Reserva Premium Malbec", null, WineType.RED, List.of("Malbec"));
        var sibling = wine("Malbec Reserve Organic Wine", null, WineType.RED, List.of("Malbec"));
        var label = labelWithEvidence("Tapiz", "Reserve Malbec", "Malbec", 2012, "RED",
                "Tapiz Reserve Malbec", List.of("TAPIZ", "RESERVE", "Malbec", "2012", "Premium"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(sibling, "Tapiz"),
                new WineLabelCandidate(expected, "Tapiz")));
        assertThat(ranked.getFirst().candidate().wine()).as("Ranking: %s", ranked).isSameAs(expected);
        assertThat(ranked.getFirst().score()).isGreaterThan(ranked.get(1).score());
        assertThat(scorer.isExact(label, ranked.get(1))).isFalse();
    }

    @Test
    void varietalNamedProducerCannotReplaceTheExplicitlyObservedProducer() {
        var expected = wine("Я Rogue Valley Syrah", null, WineType.RED, List.of("Syrah"));
        var unrelated = wine("Syrah", null, WineType.RED, List.of("Syrah"));
        var label = labelWithEvidence("Reversal", "Syrah", "Syrah", 2016, "RED",
                "Reversal Syrah", List.of("REVERSAL", "SYRAH", "ROGUE VALLEY"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(unrelated, "K Syrah Syrah"),
                new WineLabelCandidate(expected, "Reversal")));
        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(ranked.stream().filter(value -> value.candidate().wine() == unrelated))
                .allMatch(value -> !scorer.isExact(label, value));
        assertThat(scorer.isExact(label, new RankedWineLabelCandidate(
                new WineLabelCandidate(unrelated, "K Syrah Syrah"), 1.0))).isFalse();
    }

    @Test
    void missingStructuredGrapeCannotEraseAnUnseenVarietyFromTheProductName() {
        var correct = wine("Cabernet Sauvignon", null, WineType.RED, List.of("Cabernet Sauvignon"));
        var blend = wine("Malbec - Cabernet Sauvignon", null, WineType.RED, List.of("Malbec", "Cabernet Sauvignon"));
        var label = labelWithEvidence("Santa Julia", "Cabernet Sauvignon", null, null, "RED",
                "Santa Julia Cabernet Sauvignon", List.of("SANTA JULIA", "CABERNET SAUVIGNON"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(blend, "Santa Julia"),
                new WineLabelCandidate(correct, "Santa Julia")));
        assertThat(ranked.getFirst().candidate().wine()).isSameAs(correct);
        assertThat(scorer.isExact(label, ranked.get(1))).isFalse();
    }

    @Test
    void corroboratesCompleteLiteralOcrIdentityWithoutVisualProvider() {
        var wine = wine("Black Tears Malbec", null, WineType.RED, List.of("Malbec"));
        var label = new ExtractedWineLabel(null, null, null, null, null, null, null, null,
                1.0, null, null, true, List.of("TAPIZ", "BLACK TEARS", "MALBEC"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(wine, "Tapiz")));
        assertThat(ranked).hasSize(1);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
        assertThat(ranked.getFirst().score()).isGreaterThanOrEqualTo(0.90);
    }

    @Test
    void unexplainedOcrDesignationCannotPromoteGenericWineToExact() {
        var wine = wine("Malbec", null, WineType.RED, List.of("Malbec"));
        var label = new ExtractedWineLabel(null, null, null, null, null, null, null, null,
                1.0, null, null, true, List.of("TAPIZ", "BLACK TEARS", "MALBEC"));
        var candidate = new WineLabelCandidate(wine, "Tapiz");
        assertThat(scorer.isExact(label, new RankedWineLabelCandidate(candidate, 1.0))).isFalse();
    }

    @Test
    void knownContradictoryVarietyIsNotOfferedAboveTheCorrectWine() {
        var correct = wine("Mariflor", null, WineType.RED, List.of("Cabernet Franc"));
        var sibling = wine("Mariflor", null, WineType.RED, List.of("Cabernet Sauvignon"));
        var label = new ExtractedWineLabel("Michel Rolland", "Mariflor", "Cabernet Franc", null,
                "RED", null, null, null, 0.98, null, null, true,
                List.of("MARIFLOR", "MICHEL ROLLAND", "CABERNET FRANC"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(sibling, "Michel Rolland"),
                new WineLabelCandidate(correct, "Michel Rolland")));
        assertThat(ranked).hasSize(1);
        assertThat(ranked.getFirst().candidate().wine()).isSameAs(correct);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
    }

    @Test
    void ranksAVisibleSymbolVariantAboveItsPlainCatalogSibling() {
        Wine symbolicWine = wine(
                "[+] (Plus) Cabernet Sauvignon", null, WineType.RED,
                List.of("Cabernet Sauvignon"));
        Wine plainWine = wine(
                "Cabernet Sauvignon", null, WineType.RED,
                List.of("Cabernet Sauvignon"));
        ExtractedWineLabel label = new ExtractedWineLabel(
                "Santa Julia", "[+] Cabernet Sauvignon", "Cabernet Sauvignon",
                null, "RED", null, null, null, 0.95,
                "Santa Julia [+] Cabernet Sauvignon", null, true,
                List.of("SANTA JULIA [+]", "CABERNET SAUVIGNON"), List.of("+"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(label, List.of(
                new WineLabelCandidate(plainWine, "Santa Julia"),
                new WineLabelCandidate(symbolicWine, "Santa Julia")));

        assertThat(ranked.getFirst().candidate().wine()).isSameAs(symbolicWine);
        assertThat(ranked.getFirst().score()).isGreaterThan(ranked.get(1).score());
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
        assertThat(scorer.isExact(label, ranked.get(1))).isFalse();
    }

    @Test
    void ignoresAnUncorroboratedProviderSymbol() {
        Wine wine = wine(
                "'968 Montepulciano d'Abruzzo", null, WineType.RED,
                List.of("Montepulciano"));
        ExtractedWineLabel label = new ExtractedWineLabel(
                "Cantine Truentum", "'968", "Montepulciano", null,
                "RED", null, null, null, 1.0,
                "'968 Montepulciano d'Abruzzo", null, true,
                List.of("'968", "Montepulciano d'Abruzzo", "CANTINE TRUENTUM"),
                List.of("#"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(
                        wine, "Cantine Truentum"))).getFirst();

        assertThat(ranked.score()).isEqualTo(1.0);
        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void ranksANumericCommercialIdentityAboveAGenericVarietal() {
        Wine identified = wine(
                "1492 Blanco", null, WineType.WHITE, List.of());
        Wine generic = wine(
                "Chardonnay Viognier", null, WineType.WHITE,
                List.of("Chardonnay", "Viognier"));
        ExtractedWineLabel label = labelWithEvidence(
                null, "1492 Chardonnay Viognier Chenin",
                "Chardonnay Viognier Chenin", 2018, "WHITE",
                "1492 Chardonnay Viognier Chenin",
                List.of("1492", "CHARDONNAY VIOGNIER CHENIN", "2018"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(label, List.of(
                new WineLabelCandidate(generic, "Generic Winery"),
                new WineLabelCandidate(identified, "Don Cristobal")));

        assertThat(ranked.getFirst().candidate().wine()).isSameAs(identified);
        assertThat(ranked.stream()
                .filter(candidate -> candidate.candidate().wine() == generic)
                .allMatch(candidate -> candidate.score() < ranked.getFirst().score()))
                .isTrue();
    }

    @Test
    void keepsAStrongDistinctiveProductAsTopSuggestionWhenProducerRoleIsWrong() {
        Wine identified = wine(
                "100 X 100 Vineyard Selection Pinot Noir", null,
                WineType.RED, List.of("Pinot Noir"));
        Wine generic = wine("Pinot Noir", null, WineType.RED, List.of("Pinot Noir"));
        ExtractedWineLabel label = labelWithEvidence(
                "Mayor de Tours",
                "100X100 Argentina Vineyard Selection Pinot Noir",
                "Pinot Noir", 2011, "RED",
                "100X100 Vineyard Selection Pinot Noir",
                List.of("100X100", "VINEYARD SELECTION", "PINOT NOIR", "x"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(label, List.of(
                new WineLabelCandidate(generic, "Mayor de Tours"),
                new WineLabelCandidate(identified, "Munoz de Toro")));

        assertThat(ranked.getFirst().candidate().wine()).isSameAs(identified);
        assertThat(scorer.isExact(label, ranked.getFirst())).isFalse();
    }

    @Test
    void scoresZeroWhenTheLabelHasNoComparableEvidence() {
        Wine wine = wine("Malbec", null, WineType.RED, List.of());
        ExtractedWineLabel label = label(null, null, null, null, null);

        assertThat(scorer.score(label, new WineLabelCandidate(wine, null))).isZero();
    }

    @Test
    void toleratesCatalogIdentitiesMadeOnlyOfStopWords() {
        Wine wine = wine("de la", null, WineType.RED, List.of());
        ExtractedWineLabel label = labelWithEvidence(
                null, "Malbec", null, null, null, null, List.of("MALBEC"));

        assertThat(scorer.score(label, new WineLabelCandidate(wine, null)))
                .isGreaterThanOrEqualTo(0.0);
    }

    @Test
    void ranksAccentInsensitiveExactLabelAtOne() {
        Wine wine = wine("Malbec Argentino", 2021, WineType.RED, List.of("Malbec"));
        ExtractedWineLabel label = label(
                "Bodéga Catena Zapata", "Malbec Argentino", "Malbec", 2021, "RED");

        List<RankedWineLabelCandidate> ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Bodega Catena Zapata")));

        assertThat(ranked).hasSize(1);
        assertThat(ranked.getFirst().score()).isEqualTo(1.0);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
    }

    @Test
    void refusesExactClassificationWithoutBothPrimarySignals() {
        Wine wine = wine("Gran Reserva", 2020, WineType.RED, List.of("Cabernet Sauvignon"));
        ExtractedWineLabel label = label(
                null, "Gran Reserva", "Cabernet Sauvignon", 2020, "RED");

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Viña del Sol"))).getFirst();

        assertThat(ranked.score()).isLessThanOrEqualTo(0.75);
        assertThat(scorer.isExact(label, ranked)).isFalse();
    }

    @Test
    void excludesUnrelatedCatalogCandidates() {
        Wine wine = wine("Chardonnay Estate", 2018, WineType.WHITE, List.of("Chardonnay"));
        ExtractedWineLabel label = label(
                "Los Andes", "Reserva Malbec", "Malbec", 2022, "RED");

        assertThat(scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Costa Norte")))).isEmpty();
    }

    @Test
    void doesNotCollapseDifferentVisibleVintagesIntoOneExactMatch() {
        Wine wine = wine("Malbec Reserva", 2021, WineType.RED, List.of("Malbec"));
        ExtractedWineLabel label = label(
                "Bodega Norte", "Malbec Reserva", "Malbec", 2022, "RED");

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Bodega Norte"))).getFirst();

        assertThat(scorer.isExact(label, ranked)).isFalse();
    }

    @Test
    void capsVisualOnlyEvidenceAtSuggestionConfidence() {
        Wine wine = wine("Etiqueta Ilustrada", 2022, WineType.RED, List.of("Malbec"));
        ExtractedWineLabel label = label(null, null, "Malbec", 2022, "RED");

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Bodega Norte"))).getFirst();

        assertThat(ranked.score()).isLessThanOrEqualTo(0.55);
        assertThat(scorer.isExact(label, ranked)).isFalse();
    }

    @Test
    void capsObservedTextOnlyEvidenceAtSuggestionConfidence() {
        Wine wine = wine("Malbec", 2020, WineType.RED, List.of("Malbec"));
        ExtractedWineLabel label = labelWithEvidence(
                null, null, null, null, null, null,
                List.of("TAPIZ", "MALBEC", "BLACK TEARS"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Tapiz"))).getFirst();

        assertThat(ranked.score()).isLessThanOrEqualTo(0.55);
        assertThat(scorer.isExact(label, ranked)).isFalse();
    }

    @Test
    void recognizesProducerTextWhenOptionalCatalogAttributesAreMissing() {
        Wine wine = wine(
                "Retrato Por Jean Claude Single Vineyard",
                null,
                WineType.RED,
                List.of());
        ExtractedWineLabel label = labelWithEvidence(
                "Jean Claude",
                "Retrato",
                "Malbec",
                2018,
                "RED",
                "Retrato Jean Claude Single Vineyard Malbec",
                List.of(
                        "SINGLE VINEYARD",
                        "RETRATO",
                        "POR JEAN CLAUDE",
                        "MALBEC",
                        "2018"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Tapiz"))).getFirst();

        assertThat(ranked.score()).isGreaterThanOrEqualTo(
                WineLabelMatchScorer.EXACT_MATCH_THRESHOLD);
        assertThat(scorer.isExact(label, ranked))
                .withFailMessage("Expected exact classification for score %s", ranked.score())
                .isTrue();
    }

    @Test
    void ranksADistinctiveObservedLineAboveAGenericVarietalSibling() {
        Wine expected = wine(
                "Black Tears Malbec", 2020, WineType.RED, List.of("Malbec"));
        Wine generic = wine("Malbec", 2020, WineType.RED, List.of("Malbec"));
        ExtractedWineLabel label = labelWithEvidence(
                "Tapiz", "Black Tears Malbec", "Malbec", 2020, "RED",
                "Tapiz Black Tears Malbec",
                List.of("BLACK TEARS", "TAPIZ", "MALBEC", "2020"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(label, List.of(
                new WineLabelCandidate(generic, "Tapiz"),
                new WineLabelCandidate(expected, "Tapiz")));

        assertThat(ranked.getFirst().candidate().wine())
                .withFailMessage("Unexpected OCR ranking: %s", ranked.stream()
                        .map(candidate -> candidate.candidate().wine().getName()
                                + "=" + candidate.score())
                        .toList())
                .isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
    }

    @Test
    void observedNumberedProductCanLeadSuggestionsDespiteAMisreadPublicBrand() {
        var label = new ExtractedWineLabel("Bodega La Rural", "Fanfelipe", null, null,
                null, "Mendoza", "Argentina", null, 0.9, "Bodega La Rural Fanfelipe", null, true,
                List.of("12 UVAS", "Fanfelipe", "Bodega La Rural", "Desde 1885", "750 ml"));
        Wine expected = wine("12 Uvas", null, WineType.RED, List.of());
        Wine unrelated = wine("Bodega", null, WineType.RED, List.of());
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(unrelated, "Sauvage Spectrum"),
                new WineLabelCandidate(expected, "San Felipe")));
        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isFalse();
    }

    @Test
    void symbolAmbiguityRequiresTheSameProducerAndVarietalIdentity() {
        var label = labelWithEvidence("Santa Julia", "Malbec", "Malbec", null, "RED",
                "Santa Julia Malbec", List.of("SANTA JULIA", "MALBEC"));
        var generic = new WineLabelCandidate(wine("Malbec", null, WineType.RED, List.of("Malbec")), "Santa Julia");
        var plus = new WineLabelCandidate(wine("[+] (Plus) Malbec", null, WineType.RED, List.of("Malbec")), "Santa Julia");
        assertThat(scorer.isUnobservedSymbolVariant(label, generic, plus)).isTrue();
        assertThat(scorer.isUnobservedSymbolVariant(label, generic, generic)).isFalse();
        assertThat(scorer.isUnobservedSymbolVariant(label, plus, plus)).isFalse();
        assertThat(scorer.isUnobservedSymbolVariant(label, generic,
                new WineLabelCandidate(plus.wine(), "Other Winery"))).isFalse();
        var differentGrape = new WineLabelCandidate(wine("[+] Chardonnay", null, WineType.WHITE,
                List.of("Chardonnay")), "Santa Julia");
        assertThat(scorer.isUnobservedSymbolVariant(label, generic, differentGrape)).isFalse();
        var visible = new ExtractedWineLabel("Santa Julia", "Malbec", "Malbec", null, "RED",
                null, null, null, 0.9, "Santa Julia Malbec", null, true,
                List.of("SANTA JULIA [+]", "MALBEC"), List.of("+"));
        assertThat(scorer.isUnobservedSymbolVariant(visible, generic, plus)).isFalse();
    }

    @Test
    void measurementSymbolsCannotBeMistakenForCommercialProductSymbols() {
        Wine expected = wine("Malbec", null, WineType.RED, List.of("Malbec"));
        var label = new ExtractedWineLabel("El Esteco", "Malbec", "Malbec", null, "RED",
                null, null, null, 0.9, "El Esteco Malbec", null, true,
                List.of("EL ESTECO", "MALBEC", "+1.700 m.s.n.m.", "14% vol"), List.of("+", "%"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(expected, "El Esteco")));
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
        assertThat(ranked.getFirst().score()).isGreaterThanOrEqualTo(0.9);
    }

    @Test
    void unrelatedCatalogDesignationsCannotPenalizeACompleteProducerAndVariety() {
        Wine expected = wine("Cabernet Sauvignon", null, WineType.RED, List.of("Cabernet Sauvignon"));
        Wine unrelated = wine("MR Red Michel Rolland Cabernet Sauvignon", null, WineType.RED,
                List.of("Cabernet Sauvignon"));
        var label = labelWithEvidence("Mariflor", "Cabernet Sauvignon", "Cabernet Sauvignon", null,
                "RED", "Mariflor Cabernet Sauvignon",
                List.of("MARIFLOR", "Cabernet Sauvignon", "MICHEL ROLLAND", "ARGENTINA"));
        var ranked = scorer.rank(label, List.of(new WineLabelCandidate(unrelated, "Other Producer"),
                new WineLabelCandidate(expected, "Mariflor")));
        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
    }

    @Test
    void usesDistinctiveOcrEvidenceWhenStructuredExtractionIsGeneric() {
        Wine expected = wine(
                "Black Tears Malbec", 2020, WineType.RED, List.of("Malbec"));
        Wine generic = wine("Malbec", 2020, WineType.RED, List.of("Malbec"));
        ExtractedWineLabel label = labelWithEvidence(
                "Tapiz", "Malbec", "Malbec", 2020, "RED",
                "Tapiz Malbec",
                List.of("BLACK TEARS", "TAPIZ", "MALBEC", "2020"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(label, List.of(
                new WineLabelCandidate(generic, "Tapiz"),
                new WineLabelCandidate(expected, "Tapiz")));

        assertThat(ranked.getFirst().candidate().wine())
                .withFailMessage("Unexpected generic OCR ranking: %s", ranked.stream()
                        .map(candidate -> candidate.candidate().wine().getName()
                                + "=" + candidate.score())
                        .toList())
                .isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
    }

    @Test
    void ranksRiccitelliFatherAboveUnrelatedFatherAndSonLabels() {
        Wine expected = wine(
                "Father Malbec - Cabernet Franc", null, WineType.RED,
                List.of("Cabernet Franc", "Malbec"));
        Wine portrait = wine(
                "Portrait Series Father & Son", null, WineType.RED, List.of());
        Wine reserve = wine(
                "Reserve Father & Son Shiraz Cabernet", null,
                WineType.RED, List.of("Syrah"));
        ExtractedWineLabel label = new ExtractedWineLabel(
                "RICCITELLI",
                "RICCITELLI & FATHER",
                null,
                null,
                null,
                null,
                null,
                null,
                0.8,
                "RICCITELLI & FATHER",
                null,
                true,
                List.of("RICCITELLI", "& FATHER"),
                List.of("&"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(label, List.of(
                new WineLabelCandidate(portrait, "T-Vine Winery"),
                new WineLabelCandidate(reserve, "Growers"),
                new WineLabelCandidate(expected, "Matías Riccitelli")));

        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
        assertThat(ranked.stream().skip(1))
                .allMatch(candidate -> !scorer.isExact(label, candidate));
    }

    @Test
    void toleratesProviderRoleInversionForMariflorCabernetFranc() {
        Wine expected = wine(
                "Cabernet Franc", null, WineType.RED, List.of("Cabernet Franc"));
        ExtractedWineLabel label = labelWithEvidence(
                "Michel Rolland",
                "Mariflor Cabernet Franc",
                "Cabernet Franc",
                null,
                "RED",
                "Mariflor Cabernet Franc",
                List.of("MARIFLOR", "MICHEL ROLLAND", "CABERNET FRANC"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(expected, "Mariflor")))
                .getFirst();

        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void doesNotTreatAGenericLabelWordAsTheWineryIdentity() {
        Wine wine = wine("Retrato Reserva", null, WineType.RED, List.of());
        ExtractedWineLabel label = label(
                "Reserva", "Retrato", null, null, "RED");

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Pingo Doce"))).getFirst();

        assertThat(scorer.isExact(label, ranked)).isFalse();
    }

    @Test
    void resolvesBrandLineAndVarietalWhenProviderHierarchyIsWrong() {
        Wine expected = wine("Small Batch Malbec", null, WineType.RED, List.of("Malbec"));
        Wine unrelated = wine("Forastero Rosso", null, WineType.RED, List.of());
        ExtractedWineLabel label = labelWithEvidence(
                null,
                "Forastero",
                "Malbec",
                null,
                "RED",
                "Forastero Small Batch Malbec",
                List.of("FORASTERO", "MALBEC", "SMALL BATCH"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(
                label,
                List.of(
                        new WineLabelCandidate(unrelated, "Brama"),
                        new WineLabelCandidate(expected, "Forastero")));

        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
        assertThat(ranked.get(1).score()).isLessThan(ranked.getFirst().score());
        assertThat(ranked.get(1).score()).isLessThan(
                WineLabelMatchScorer.EXACT_MATCH_THRESHOLD);
    }

    @Test
    void usesVisibleVariantWordsToRejectAnotherWineFromSameFamily() {
        Wine expected = wine("Reserva Malbec", null, WineType.RED, List.of("Malbec"));
        Wine wrongVariant = wine(
                "Reserva Cabernet Sauvignon",
                null,
                WineType.RED,
                List.of("Cabernet Sauvignon"));
        ExtractedWineLabel label = labelWithEvidence(
                "Casa Sur",
                "Casa Sur",
                "Malbec",
                null,
                "RED",
                "Casa Sur Reserva Malbec",
                List.of("CASA SUR", "RESERVA", "MALBEC"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(
                label,
                List.of(
                        new WineLabelCandidate(wrongVariant, "Casa Sur"),
                        new WineLabelCandidate(expected, "Casa Sur")));

        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
        assertThat(ranked.stream()
                .filter(candidate -> candidate.candidate().wine() == wrongVariant)
                .allMatch(candidate -> !scorer.isExact(label, candidate)))
                .isTrue();
    }

    @Test
    void keepsBrandOnlyEvidenceAtSuggestionLevel() {
        Wine first = wine("Malbec", null, WineType.RED, List.of("Malbec"));
        Wine second = wine(
                "Cabernet Sauvignon",
                null,
                WineType.RED,
                List.of("Cabernet Sauvignon"));
        ExtractedWineLabel label = labelWithEvidence(
                "Casa Sur",
                null,
                null,
                null,
                "RED",
                null,
                List.of("CASA SUR"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(
                label,
                List.of(
                        new WineLabelCandidate(first, "Casa Sur"),
                        new WineLabelCandidate(second, "Casa Sur")));

        assertThat(ranked).hasSize(2);
        assertThat(ranked)
                .allMatch(candidate -> !scorer.isExact(label, candidate));
    }

    @Test
    void acceptsDessertWineWhenVisibleColorWasClassifiedAsWhite() {
        Wine wine = wine(
                "Cosecha Tardia Blanco Dulce",
                null,
                WineType.DESSERT,
                List.of());
        ExtractedWineLabel label = labelWithEvidence(
                "Bodega Norton",
                "Cosecha Tardia Blanco Dulce",
                null,
                null,
                "WHITE",
                "Norton Cosecha Tardia Blanco Dulce",
                List.of("COSECHA TARDIA", "BLANCO DULCE", "NORTON"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Bodega Norton")))
                .getFirst();

        assertThat(ranked.score()).isGreaterThanOrEqualTo(
                WineLabelMatchScorer.EXACT_MATCH_THRESHOLD);
        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void acceptsCompleteCatalogIdentityAboveTheCalibratedConfidenceFloor() {
        Wine wine = wine(
                "Facón Selection Cabernet Sauvignon",
                null,
                WineType.RED,
                List.of("Cabernet Sauvignon"));
        ExtractedWineLabel label = labelWithEvidence(
                "Bad Brothers",
                "Facón Selection Cabernet Sauvignon",
                "Cabernet Sauvignon",
                2019,
                "RED",
                "Bad Brothers Facón Selection Cabernet Sauvignon",
                List.of(
                        "BAD BROTHERS",
                        "FACÓN SELECTION",
                        "CABERNET SAUVIGNON",
                        "2019"));
        WineLabelCandidate candidate = new WineLabelCandidate(wine, "Bad Brothers");
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(candidate, 0.83);

        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void keepsAnIncompleteNeighboringVariantAsASuggestionDespiteAHighScore() {
        Wine wine = wine(
                "Facón Selection Tannat - Cabernet Sauvignon",
                null,
                WineType.RED,
                List.of("Tannat", "Cabernet Sauvignon"));
        ExtractedWineLabel label = labelWithEvidence(
                "Bad Brothers",
                "Facón Selection Cabernet Sauvignon",
                "Cabernet Sauvignon",
                2019,
                "RED",
                "Bad Brothers Facón Selection Cabernet Sauvignon",
                List.of(
                        "BAD BROTHERS",
                        "FACÓN SELECTION",
                        "CABERNET SAUVIGNON",
                        "2019"));
        WineLabelCandidate candidate = new WineLabelCandidate(wine, "Bad Brothers");
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(candidate, 0.9594);

        assertThat(scorer.isExact(label, ranked)).isFalse();
    }

    @Test
    void doesNotMixLegalLabelCopyIntoStructuredProductIdentity() {
        Wine wine = wine(
                "Facón Selection Cabernet Sauvignon",
                null,
                WineType.RED,
                List.of("Cabernet Sauvignon"));
        ExtractedWineLabel label = labelWithEvidence(
                "Bad Brothers",
                "Facón Selection Cabernet Sauvignon",
                "Cabernet Sauvignon",
                2019,
                "RED",
                "Bad Brothers Facón Selection Cabernet Sauvignon",
                List.of(
                        "Bad Brothers",
                        "2019",
                        "FACÓN SELECTION",
                        "Cabernet Sauvignon",
                        "Tolombón, Salta, Argentina",
                        "Vinos de Gran Altura. 1.800 MSNM",
                        "www.agustinlanuswines.com",
                        "Producto Argentino",
                        "Vino Tinto",
                        "Contiene Sulfitos",
                        "750 ml",
                        "14.5% Vol",
                        "Elaborado por y embotellado por Sorocayol S.A.",
                        "Altos Terruños S.A."));
        WineLabelCandidate candidate = new WineLabelCandidate(wine, "Bad Brothers");
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(candidate, 0.831);

        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void doesNotTreatAPartialProducerTokenAsACompleteIdentity() {
        Wine wrong = wine(
                "Cabernet Sauvignon",
                null,
                WineType.RED,
                List.of("Cabernet Sauvignon"));
        ExtractedWineLabel label = labelWithEvidence(
                null,
                "Caminito Cabernet Sauvignon",
                "Cabernet Sauvignon",
                2017,
                "RED",
                "Caminito Cabernet Sauvignon",
                List.of("CAMINITO", "CABERNET SAUVIGNON", "2017"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wrong, "Cami"))).getFirst();

        assertThat(WineLabelMatchScorer.textSimilarity("Cami", "Caminito"))
                .isLessThan(0.72);
        assertThat(scorer.isExact(label, ranked)).isFalse();
    }

    @Test
    void acceptsAPublicBrandStoredInTheWineNameInsteadOfTheLegalProducer() {
        Wine wine = wine(
                "Chupasangre Malbec Rose",
                null,
                WineType.ROSE,
                List.of("Malbec"));
        ExtractedWineLabel label = labelWithEvidence(
                "Chupasangre",
                "Rose de Malbec",
                "Malbec",
                2021,
                "ROSE",
                "Chupasangre Rose de Malbec",
                List.of("CHUPASANGRE", "ROSE DE MALBEC", "2021"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label,
                List.of(new WineLabelCandidate(wine, "Familia Kretschmar")))
                .getFirst();

        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void rejectsAProductCompetitorThatOmitsTheProminentBrand() {
        Wine expected = wine(
                "Domaine Brut Nature", null, WineType.SPARKLING, List.of());
        Wine competitor = wine(
                "Brut Nature", null, WineType.SPARKLING, List.of());
        ExtractedWineLabel label = labelWithEvidence(
                "Mumm",
                "Domaine Brut Nature",
                null,
                null,
                "SPARKLING",
                "Mumm Domaine Brut Nature",
                List.of("MUMM", "DOMAINE", "BRUT NATURE"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(
                label,
                List.of(
                        new WineLabelCandidate(competitor, "Domaine W"),
                        new WineLabelCandidate(expected, "Mumm")));

        assertThat(ranked.getFirst().candidate().wine()).isSameAs(expected);
        assertThat(scorer.isExact(label, ranked.getFirst())).isTrue();
        assertThat(ranked.stream()
                .filter(candidate -> candidate.candidate().wine() == competitor)
                .allMatch(candidate -> !scorer.isExact(label, candidate)))
                .isTrue();
    }

    @Test
    void suggestsAShortPublicBrandStoredInTheWineName() {
        Wine wine = wine("{Rose} Zetta", null, WineType.RED, List.of());
        ExtractedWineLabel label = labelWithEvidence(
                "ZETTA", null, null, null, null,
                "ZETTA", List.of("ZETTA"));

        List<RankedWineLabelCandidate> ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Smith Devereux")));

        assertThat(ranked).hasSize(1);
        assertThat(scorer.isExact(label, ranked.getFirst())).isFalse();
    }

    @Test
    void recognizesEquivalentRowsWithBrandAndProducerStoredInOppositeFields() {
        Wine first = wine(
                "Dulce Natural de Torrontes", null, WineType.DESSERT,
                List.of("Torrontes"));
        Wine second = wine(
                "Elementos Torrontes Dulce Natural", null, WineType.DESSERT,
                List.of("Torrontes"));
        ExtractedWineLabel label = labelWithEvidence(
                "Elementos",
                "Torrontes Dulce Natural",
                "Torrontes",
                2005,
                "DESSERT",
                "Elementos Torrontes Dulce Natural",
                List.of("ELEMENTOS", "TORRONTES DULCE NATURAL", "BODEGA EL ESTECO"));
        List<RankedWineLabelCandidate> ranked = scorer.rank(
                label,
                List.of(
                        new WineLabelCandidate(first, "Elementos"),
                        new WineLabelCandidate(second, "El Esteco")));

        assertThat(scorer.representsSameCatalogIdentity(
                label, ranked.getFirst(), ranked.get(1))).isTrue();
    }

    @Test
    void treatsMissingGrapeCollectionsAsCompatibleCatalogMetadata() {
        Wine first = wine("Reserva Malbec", null, WineType.RED, List.of());
        Wine second = wine("Reserva Malbec", null, WineType.RED, List.of());
        ExtractedWineLabel label = labelWithEvidence(
                "Casa Sur", "Reserva Malbec", null, null, "RED",
                "Casa Sur Reserva Malbec", List.of("CASA SUR", "RESERVA MALBEC"));
        RankedWineLabelCandidate left = new RankedWineLabelCandidate(
                new WineLabelCandidate(first, "Casa Sur"), 0.95);
        RankedWineLabelCandidate right = new RankedWineLabelCandidate(
                new WineLabelCandidate(second, "Casa Sur"), 0.94);

        assertThat(scorer.representsSameCatalogIdentity(label, left, right)).isTrue();
    }

    @Test
    void confirmsACompleteVarietalAndProducerIdentityAboveTheCalibratedFloor() {
        Wine wine = wine("Syrah", null, WineType.RED, List.of("Syrah"));
        ExtractedWineLabel label = labelWithEvidence(
                "Ichanka",
                "Syrah",
                "Syrah",
                null,
                "RED",
                "Ichanka Syrah",
                List.of("SYRAH", "ICHANKA", "FAMATINA VALLEY", "ARGENTINA"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Ichanka"))).getFirst();

        assertThat(ranked.score()).isGreaterThanOrEqualTo(
                WineLabelMatchScorer.COMPLETE_IDENTITY_MATCH_THRESHOLD);
        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void acceptsVisibleBrandSplitBetweenCatalogProducerAndWineName() {
        Wine wine = wine("Chardonnay", 2014, WineType.WHITE, List.of("Chardonnay"));
        ExtractedWineLabel label = labelWithEvidence(
                "Agostino",
                "Inicio Chardonnay",
                "Chardonnay",
                2014,
                "WHITE",
                "Agostino Inicio Chardonnay",
                List.of("AGOSTINO", "INICIO", "CHARDONNAY", "2014"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Agostino Inicio")))
                .getFirst();

        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    @Test
    void usesCompactSearchIdentityWhenLabelNameContainsADescriptiveSubtitle() {
        Wine wine = wine(
                "AD Astra Rosé de Malbec", 2017, WineType.ROSE, List.of("Malbec"));
        ExtractedWineLabel label = labelWithEvidence(
                "AD Astra",
                "Rosé de Malbec Bajo las Estrellas",
                "Malbec",
                2017,
                "ROSE",
                "AD Astra Rosé de Malbec",
                List.of(
                        "AD ASTRA",
                        "ROSÉ DE MALBEC",
                        "BAJO LAS ESTRELLAS",
                        "2017"));

        WineLabelCandidate candidate = new WineLabelCandidate(wine, "Buenaventura");
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(candidate, 0.84);

        assertThat(scorer.isExact(label, ranked))
                .withFailMessage("Expected exact classification for score %s", ranked.score())
                .isTrue();
    }

    @Test
    void doesNotRequireAnUnobservedGenericCatalogBlend() {
        Wine wine = wine(
                "Toso De La Finca Tinto", null, WineType.RED, List.of("Blend"));
        ExtractedWineLabel label = labelWithEvidence(
                "Toso",
                "De La Finca Vino Fino Tinto",
                null,
                null,
                "RED",
                "Toso De La Finca",
                List.of("DE LA FINCA", "TOSO", "VINO FINO TINTO"));

        RankedWineLabelCandidate ranked = scorer.rank(
                label, List.of(new WineLabelCandidate(wine, "Pascual Toso")))
                .getFirst();

        assertThat(scorer.isExact(label, ranked)).isTrue();
    }

    private Wine wine(
            String name, Integer vintage, WineType type, List<String> grapes) {
        Wine wine = Wine.create(name, UUID.randomUUID(), type, UUID.randomUUID());
        wine.updateBasicInfo(name, vintage, null, null);
        wine.updateGrapes(grapes);
        return wine;
    }

    private ExtractedWineLabel label(
            String winery, String name, String grape, Integer vintage, String type) {
        return labelWithEvidence(
                winery, name, grape, vintage, type, null, List.of());
    }

    private ExtractedWineLabel labelWithEvidence(
            String winery,
            String name,
            String grape,
            Integer vintage,
            String type,
            String searchKeywords,
            List<String> observedText) {
        return new ExtractedWineLabel(
                winery, name, grape, vintage, type, null, null, null,
                0.95, searchKeywords, null, true, observedText);
    }
}
