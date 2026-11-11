package com.vinnot.wine.domain.service;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WineLabelIdentityNormalizerTest {
    @Test
    void producerCoreKeepsDistinctiveWordsInPrintedOrder() {
        assertThat(WineLabelIdentityNormalizer.producerCore("Bodega Mevi")).isEqualTo("mevi");
        assertThat(WineLabelIdentityNormalizer.producerCore("Finca Camuñas")).isEqualTo("camunas");
        assertThat(WineLabelIdentityNormalizer.producerCore("Viñedos y Bodegas Pascual Toso S.A."))
                .isEqualTo("pascual toso");
        assertThat(WineLabelIdentityNormalizer.producerCore("Bodegas de la Finca")).isEmpty();
        assertThat(WineLabelIdentityNormalizer.producerCore(null)).isEmpty();
    }

    @Test
    void recognizesLinesMadeOnlyOfGenericDesignationsOrKnownContext() {
        List<String> context = Arrays.asList("Viognier", null, "Mendoza", "Argentina");
        for (String generic : List.of("Edición Limitada", "ESTATE GROWN VIOGNIER", "Vino Fino Tinto",
                "OLD VINE BLEND", "Gran Reserva", "Single Vineyard Mendoza", "Rosé Brut Nature")) {
            assertThat(WineLabelIdentityNormalizer.isGenericDesignationOnly(generic, context)).as(generic).isTrue();
        }
        for (String identity : List.of("Edición Limitada Isabella", "Luna Roja", "Gran Reserva 1884", "Alamos",
                "---", "")) {
            assertThat(WineLabelIdentityNormalizer.isGenericDesignationOnly(identity, context)).as(identity).isFalse();
        }
    }

    @Test
    void recognizesCompleteLongProducerNamesSplitByOcrWithoutAcceptingPartialBrands() {
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("REVER SAL", "Reversal")).isEqualTo(1.0);
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("LuigiBosca", "Luigi Bosca")).isEqualTo(1.0);
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("Casa Blanca", "Casablanca")).isEqualTo(1.0);
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("Rever Sal Reserve", "Reversal")).isLessThan(1.0);
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("Catena", "Catena Zapata")).isLessThan(1.0);
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("A B", "AB")).isLessThan(1.0);
    }

    @Test
    void producerCoreSimilarityIsIndependentOfTokenOrder() {
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("Bodega Valle Claro", "Claro Valle Winery"))
                .isEqualTo(1.0);
        assertThat(WineLabelIdentityNormalizer.producerSimilarity("Bodega Valle Claro", "Winery Valley Claro"))
                .isEqualTo(Math.max(
                        WineLabelIdentityNormalizer.textSimilarity("Bodega Valle Claro", "Winery Valley Claro"),
                        WineLabelIdentityNormalizer.textSimilarity("claro valle", "claro valley")));
    }

    @Test
    void canonicalizesOrganicDescriptorsButKeepsLiteralSearchTerms() {
        for (String value : List.of("Orgánico", "Orgânica", "Organique", "Organic")) {
            assertThat(WineLabelIdentityNormalizer.significantTokens(value)).containsExactly("organic");
        }
        assertThat(WineLabelIdentityNormalizer.searchTokens("Orgánico")).containsExactly("organico");
        assertThat(WineLabelIdentityNormalizer.significantTokens("Gran Malbec")).doesNotContain("organic");
    }

    @Test
    void measurementNumbersAreNotCuveeNumbers() {
        for (String line : List.of("1200 MTS. ALTITUD", "1200 m", "1200 metros", "1200 altitude",
                "750 ml", "14 vol", "1700 MSNM")) {
            assertThat(WineLabelIdentityNormalizer.isNumberedProductLine(line)).as(line).isFalse();
        }
        assertThat(WineLabelIdentityNormalizer.isNumberedProductLine("1492 Malbec")).isTrue();
        assertThat(WineLabelIdentityNormalizer.isNumberedProductLine("12 Uvas")).isTrue();
    }


    @Test
    void emptyTokenSetsHaveZeroCoverageAndSimilarity() {
        assertThat(WineLabelIdentityNormalizer.coverage(Set.of(), Set.of("malbec")))
                .isZero();
        assertThat(WineLabelIdentityNormalizer.jaccard(Set.of(), Set.of("malbec")))
                .isZero();
        assertThat(WineLabelIdentityNormalizer.jaccard(Set.of("malbec"), Set.of()))
                .isZero();
    }

    @Test
    void preservesDistinctiveSpanishProducerIdentity() {
        assertThat(WineLabelIdentityNormalizer.producerTokens(
                "Bodega Familia Finca Los Andes"))
                .containsExactly("andes");
    }

    @Test
    void preservesDistinctiveFrenchProducerIdentity() {
        assertThat(WineLabelIdentityNormalizer.producerTokens(
                "Château Domaine de la Romanée"))
                .containsExactly("romanee");
    }

    @Test
    void preservesDistinctiveItalianProducerIdentity() {
        assertThat(WineLabelIdentityNormalizer.producerTokens(
                "Azienda Agricola Tenuta San Guido"))
                .containsExactlyInAnyOrder("guido", "san");
    }

    @Test
    void preservesDistinctivePortugueseProducerIdentity() {
        assertThat(WineLabelIdentityNormalizer.producerTokens(
                "Quinta da Família dos Santos"))
                .containsExactly("santos");
    }

    @Test
    void preservesDistinctiveGermanProducerIdentity() {
        assertThat(WineLabelIdentityNormalizer.producerTokens(
                "Weingut Schloss Johannisberg"))
                .containsExactly("johannisberg");
    }

    @Test
    void supportsEnglishLanguageProducersUsedByAustralianWines() {
        assertThat(WineLabelIdentityNormalizer.producerTokens(
                "Hope River Family Estate"))
                .containsExactlyInAnyOrder("hope", "river");
    }

    @Test
    void keepsProducerDesignatorsWhenTheyArePartOfTheWineName() {
        assertThat(WineLabelIdentityNormalizer.significantTokens(
                "Finca La Escuela Malbec"))
                .contains("finca", "escuela", "malbec");
    }

    @Test
    void preservesCommercialNumbersButDropsPlausibleVintages() {
        assertThat(WineLabelIdentityNormalizer.significantTokens(
                "1492 Blanco 2018"))
                .contains("1492", "blanco")
                .doesNotContain("2018");
    }

    @Test
    void canonicalizesCompactMultiplicationIdentities() {
        assertThat(WineLabelIdentityNormalizer.normalize("100×100"))
                .isEqualTo("100 x 100");
        assertThat(WineLabelIdentityNormalizer.significantTokens("100 X 100"))
                .contains("100", "x");
    }

    @Test
    void keepsIdentitySymbolsSeparateFromOrdinaryWords() {
        Set<String> symbolic = WineLabelIdentityNormalizer.significantTokens(
                "[+] (Plus) Cabernet Sauvignon");
        Set<String> plain = WineLabelIdentityNormalizer.significantTokens(
                "Cabernet Sauvignon");

        assertThat(symbolic).contains("plus", "__symbol_plus__");
        assertThat(plain).doesNotContain("plus", "__symbol_plus__");
    }

    @Test
    void normalizesLatinCompatibilityLetters() {
        assertThat(WineLabelIdentityNormalizer.normalize("Cuvée Blåbær Øl Œuvre"))
                .isEqualTo("cuvee blabaer ol oeuvre");
    }

    @Test
    void preservesNonLatinScripts() {
        assertThat(WineLabelIdentityNormalizer.normalize("Αμαραντον Λιατικο"))
                .isEqualTo("αμαραντον λιατικο");
        assertThat(WineLabelIdentityNormalizer.significantTokens("Ρετσίνα"))
                .containsExactly("ρετσινα");
    }

    @Test
    void extractsGenericCommercialDiscriminatorsWithoutTreatingVintageAsIdentity() {
        assertThat(WineLabelIdentityNormalizer.identityDiscriminatorTokens(
                "100 X 100 #007 1492 2019"))
                .contains("__symbol_multiplication__", "__symbol_hash__",
                        "__number_100__", "__number_007__", "__number_1492__")
                .doesNotContain("__number_2019__");
    }

    @Test
    void keepsMultiplicativeCommercialIdentifiersAsSearchPhrases() {
        assertThat(WineLabelIdentityNormalizer.commercialIdentifierSearchTerms(
                "100X100 Argentina Vineyard Selection"))
                .containsExactly("100 x 100");
        assertThat(WineLabelIdentityNormalizer.commercialIdentifierSearchTerms(
                "1492 Blanco 2018"))
                .containsExactly("1492");
    }
}
