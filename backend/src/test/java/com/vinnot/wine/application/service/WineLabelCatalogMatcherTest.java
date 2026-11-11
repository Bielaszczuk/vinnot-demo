package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineVisualIndexPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.service.WineLabelMatchScorer;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;

class WineLabelCatalogMatcherTest {

    private final WineLabelCandidateRetriever candidateRetriever =
            mock(WineLabelCandidateRetriever.class);
    private final WineryQueryPort wineryQueryPort = mock(WineryQueryPort.class);
    private final WineLabelCatalogMatcher matcher = new WineLabelCatalogMatcher(
            candidateRetriever, wineryQueryPort, new WineLabelMatchScorer(),
            (category, value) -> value);

    @Test
    void retrievesCandidatesUsingEveryVisibleIdentityLevel() {
        UUID wineryId = UUID.randomUUID();
        Wine expected = wine("Small Batch Malbec", wineryId, "Malbec");
        Wine generic = wine("Malbec", wineryId, "Malbec");
        ExtractedWineLabel label = label(
                null,
                "Forastero",
                "Malbec",
                "Forastero Small Batch Malbec",
                List.of("FORASTERO", "MALBEC", "SMALL BATCH"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(generic, expected));
        when(wineryQueryPort.findAllByIds(List.of(wineryId)))
                .thenReturn(List.of(winery(wineryId, "Forastero")));

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label);

        assertThat(result.exact())
                .withFailMessage("Unexpected ranking: %s", result.ranked().stream()
                        .map(candidate -> candidate.candidate().wine().getName()
                                + "=" + candidate.score())
                        .toList())
                .isTrue();
        assertThat(result.ranked().getFirst().candidate().wine()).isSameAs(expected);
        assertThat(result.ranked().get(1).score())
                .isLessThan(WineLabelMatchScorer.EXACT_MATCH_THRESHOLD);
    }

    @Test
    void consolidatesDuplicateCatalogRowsBeforeResolvingAnExactIdentity() {
        UUID wineryId = UUID.randomUUID();
        Wine first = wine("Reserva Malbec", wineryId, "Malbec");
        Wine second = wine("Reserva Malbec", wineryId, "Malbec");
        ExtractedWineLabel label = label(
                "Casa Sur",
                "Reserva Malbec",
                "Malbec",
                "Casa Sur Reserva Malbec",
                List.of("CASA SUR", "RESERVA MALBEC"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(first, second));
        when(wineryQueryPort.findAllByIds(List.of(wineryId)))
                .thenReturn(List.of(winery(wineryId, "Casa Sur")));

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label);

        assertThat(result.ranked()).hasSize(1);
        assertThat(result.exact()).isTrue();
    }

    @Test
    void resolvesDistinctiveOcrEvidenceWhenProviderFieldsAreGeneric() {
        UUID wineryId = UUID.randomUUID();
        Wine expected = wine("Black Tears Malbec", wineryId, "Malbec");
        Wine generic = wine("Malbec", wineryId, "Malbec");
        ExtractedWineLabel label = label(
                "Tapiz",
                "Malbec",
                "Malbec",
                "Tapiz Malbec",
                List.of("BLACK TEARS", "TAPIZ", "MALBEC", "2020"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(generic, expected));
        when(wineryQueryPort.findAllByIds(List.of(wineryId)))
                .thenReturn(List.of(winery(wineryId, "Tapiz")));

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label);

        assertThat(result.ranked().getFirst().candidate().wine()).isSameAs(expected);
        assertThat(result.exact()).isTrue();
    }

    @Test
    void resolvesElEstecoVarietalWithoutPromotingItsNamedSibling() {
        UUID wineryId = UUID.randomUUID();
        Wine expected = wine(
                "Cabernet Sauvignon", wineryId, "Cabernet Sauvignon");
        Wine sibling = wine(
                "Ciclos Cabernet Sauvignon", wineryId, "Cabernet Sauvignon");
        ExtractedWineLabel label = label(
                "El Esteco",
                "Cabernet Sauvignon",
                "Cabernet Sauvignon",
                "El Esteco Cabernet Sauvignon",
                List.of(
                        "EL ESTECO", "ESTATE BOTTLED",
                        "CABERNET SAUVIGNON", "VALLE DE CAFAYATE"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(sibling, expected));
        when(wineryQueryPort.findAllByIds(List.of(wineryId)))
                .thenReturn(List.of(winery(wineryId, "El Esteco")));

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label);

        assertThat(result.ranked().getFirst().candidate().wine()).isSameAs(expected);
        assertThat(result.exact()).isTrue();
        assertThat(result.ranked().stream()
                .filter(candidate -> candidate.candidate().wine() == sibling)
                .allMatch(candidate -> !new WineLabelMatchScorer()
                        .isExact(label, candidate)))
                .isTrue();
    }

    @Test
    void ignoresACloseSuggestionWhenOnlyTheLeadingCandidateHasCompleteIdentity() {
        UUID wineryId = UUID.randomUUID();
        Wine expected = wine(
                "Facón Selection Cabernet Sauvignon", wineryId, "Cabernet Sauvignon");
        Wine neighboringVariant = wine(
                "Facón Selection Tannat - Cabernet Sauvignon",
                wineryId,
                "Cabernet Sauvignon");
        ExtractedWineLabel label = label(
                "Bad Brothers",
                "Facón Selection Cabernet Sauvignon",
                "Cabernet Sauvignon",
                "Bad Brothers Facón Selection Cabernet Sauvignon",
                List.of("BAD BROTHERS", "FACÓN SELECTION", "CABERNET SAUVIGNON"));
        RankedWineLabelCandidate leading = new RankedWineLabelCandidate(
                new WineLabelCandidate(expected, "Bad Brothers"), 0.83);
        RankedWineLabelCandidate suggestion = new RankedWineLabelCandidate(
                new WineLabelCandidate(neighboringVariant, "Bad Brothers"), 0.82);
        WineLabelMatchScorer scorer = mock(WineLabelMatchScorer.class);
        WineLabelCatalogMatcher localMatcher = new WineLabelCatalogMatcher(
                candidateRetriever, wineryQueryPort, scorer,
                (category, value) -> value);
        when(candidateRetriever.retrieve(eq(label), any()))
                .thenReturn(List.of(expected, neighboringVariant));
        when(wineryQueryPort.findAllByIds(List.of(wineryId)))
                .thenReturn(List.of(winery(wineryId, "Bad Brothers")));
        when(scorer.rank(eq(label), any()))
                .thenReturn(List.of(leading, suggestion));
        when(scorer.isExact(label, leading)).thenReturn(true);
        when(scorer.isExact(label, suggestion)).thenReturn(false);

        WineLabelCatalogMatcher.MatchResult result = localMatcher.match(label);

        assertThat(result.exact()).isTrue();
        assertThat(result.ranked().getFirst()).isSameAs(leading);
    }

    @Test
    void returnsNoExactMatchWhenCandidateRetrievalIsEmpty() {
        ExtractedWineLabel label = label(
                null, "Unknown", null, "Unknown", List.of("UNKNOWN"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of());
        when(wineryQueryPort.findAllByIds(List.of())).thenReturn(List.of());

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label);

        assertThat(result.ranked()).isEmpty();
        assertThat(result.exact()).isFalse();
    }

    @Test
    void rejectsNonWineImagesBeforeCatalogRetrieval() {
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, "Dark Roast", null, null, null, null, null, null,
                0.99, "dark roast coffee", null, false,
                List.of("DARK ROAST", "COFFEE"));

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label);

        assertThat(result.exact()).isFalse();
        assertThat(result.ranked()).isEmpty();
        verifyNoInteractions(candidateRetriever, wineryQueryPort);
    }

    @Test
    void keepsTwoCloseExactCandidatesAmbiguous() {
        Wine firstWine = wine("Reserva Malbec", null, "Malbec");
        Wine secondWine = wine("Reserva Especial Malbec", null, "Malbec");
        ExtractedWineLabel label = label(
                "Casa Sur", "Reserva Malbec", "Malbec",
                "Casa Sur Reserva Malbec", List.of("CASA SUR", "RESERVA MALBEC"));
        RankedWineLabelCandidate first = new RankedWineLabelCandidate(
                new WineLabelCandidate(firstWine, "Casa Sur"), 0.95);
        RankedWineLabelCandidate second = new RankedWineLabelCandidate(
                new WineLabelCandidate(secondWine, "Casa Sur"), 0.91);
        WineLabelMatchScorer scorer = mock(WineLabelMatchScorer.class);
        WineLabelCatalogMatcher localMatcher = new WineLabelCatalogMatcher(
                candidateRetriever, wineryQueryPort, scorer, (category, value) -> value);
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(firstWine, secondWine));
        when(wineryQueryPort.findAllByIds(List.of())).thenReturn(List.of());
        when(scorer.rank(eq(label), any())).thenReturn(List.of(first, second));
        when(scorer.isExact(label, first)).thenReturn(true);
        when(scorer.isExact(label, second)).thenReturn(true);

        WineLabelCatalogMatcher.MatchResult result = localMatcher.match(label);

        assertThat(result.exact()).isFalse();
        assertThat(result.wineries()).isEqualTo(Map.of());
    }

    @Test
    void missingCommercialSymbolKeepsVarietalSiblingsAsExplicitAlternatives() {
        UUID wineryId = UUID.randomUUID();
        Wine generic = wine("Cabernet Sauvignon", wineryId, "Cabernet Sauvignon");
        Wine plus = wine("[+] (Plus) Cabernet Sauvignon", wineryId, "Cabernet Sauvignon");
        Wine reserve = wine("Reserve Cabernet Sauvignon", wineryId, "Cabernet Sauvignon");
        var label = label("Santa Julia", "Cabernet Sauvignon", "Cabernet Sauvignon",
                "Santa Julia Cabernet Sauvignon", List.of("SANTA JULIA", "CABERNET SAUVIGNON"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(generic, reserve, plus));
        when(wineryQueryPort.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery(wineryId, "Santa Julia")));
        var result = matcher.match(label);
        assertThat(result.exact()).isFalse();
        assertThat(result.ranked()).extracting(candidate -> candidate.candidate().wine())
                .containsExactly(generic, plus);
    }

    @Test
    void optionalExpansionTimeoutPreservesUsableIndexedSuggestions() {
        UUID wineryId = UUID.randomUUID();
        Wine candidate = wine("Malbec", wineryId, "Malbec");
        var label = label("Tapiz", "Black Tears Malbec", "Malbec", "Tapiz Black Tears Malbec", List.of());
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(candidate));
        when(wineryQueryPort.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery(wineryId, "Tapiz")));
        when(candidateRetriever.retrieveApproximate(eq(label), any())).thenThrow(
                new ExternalServiceUnavailableException(
                        "LABEL_CATALOG_UNAVAILABLE", "timeout", null));
        var result = matcher.match(label);
        assertThat(result.exact()).isFalse();
        assertThat(result.ranked()).hasSize(1);
        when(candidateRetriever.retrieveApproximate(eq(label), any())).thenThrow(
                new ExternalServiceUnavailableException(
                        "LABEL_SCAN_TIMEOUT", "optional stage timeout", null));
        assertThat(matcher.match(label).ranked()).hasSize(1);
    }

    @Test
    void avoidsOptionalExpansionWithoutHeadroomButDoesNotInventNoMatch() {
        UUID wineryId = UUID.randomUUID();
        var label = label("Tapiz", "Black Tears Malbec", "Malbec", "Tapiz Black Tears Malbec", List.of());
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(wine("Malbec", wineryId, "Malbec")));
        when(wineryQueryPort.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery(wineryId, "Tapiz")));
        assertThat(matcher.match(label, new WineLabelScanDeadline(Duration.ofSeconds(2))).ranked()).hasSize(1);
        verify(candidateRetriever, never()).retrieveApproximate(any(), any());
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(wine("Unrelated", wineryId, "Chardonnay")));
        when(wineryQueryPort.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery(wineryId, "Other")));
        assertThatThrownBy(() -> matcher.match(label,
                new WineLabelScanDeadline(Duration.ofSeconds(2))))
                .isInstanceOf(ExternalServiceUnavailableException.class)
                .extracting("code").isEqualTo("LABEL_SCAN_TIMEOUT");
    }

    @Test
    void optionalExpansionCannotHideTotalRetrievalFailureOrDeadline() {
        UUID wineryId = UUID.randomUUID();
        Wine candidate = wine("Unrelated", wineryId, "Chardonnay");
        var label = label("Tapiz", "Black Tears Malbec", "Malbec", "Tapiz Black Tears Malbec", List.of());
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(candidate));
        when(wineryQueryPort.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery(wineryId, "Other")));
        var unavailable = new ExternalServiceUnavailableException(
                "LABEL_CATALOG_UNAVAILABLE", "timeout", null);
        when(candidateRetriever.retrieveApproximate(eq(label), any())).thenThrow(unavailable);
        assertThatThrownBy(() -> matcher.match(label)).isSameAs(unavailable);
        var deadline = new ExternalServiceUnavailableException(
                "LABEL_SCAN_TIMEOUT", "deadline", null);
        when(candidateRetriever.retrieveApproximate(eq(label), any())).thenThrow(deadline);
        assertThatThrownBy(() -> matcher.match(label)).isSameAs(deadline);
    }

    @Test
    void supplementsWeakIndexedCandidatesAndRanksTheUnionWithTheSamePolicy() {
        UUID wineryId = UUID.randomUUID();
        Wine unrelated = wine("Other", wineryId, "Malbec");
        Wine expected = wine("Black Tears Malbec", wineryId, "Malbec");
        ExtractedWineLabel label = label("Tapiz", "Black Tears Malbec", "Malbec",
                "Tapiz Black Tears Malbec", List.of("TAPIZ", "BLACK TEARS", "MALBEC"));
        when(candidateRetriever.retrieve(eq(label), any()))
                .thenReturn(List.of(unrelated));
        when(candidateRetriever.retrieveApproximate(eq(label), any()))
                .thenReturn(List.of(unrelated, expected));
        when(wineryQueryPort.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery(wineryId, "Tapiz")));
        var result = matcher.match(label);
        assertThat(result.exact()).isTrue();
        assertThat(result.ranked().getFirst().candidate().wine()).isSameAs(expected);
    }

    @Test
    void ignoresMissingWineryMetadataForCatalogRowsWithoutAWinery() {
        Wine wine = wine("Malbec", null, "Malbec");
        ExtractedWineLabel label = label(
                null, "Malbec", "Malbec", "Malbec", List.of("MALBEC"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(wine));
        when(wineryQueryPort.findAllByIds(List.of())).thenReturn(List.of());

        matcher.match(label);

        verify(wineryQueryPort).findAllByIds(List.of());
    }

    @Test
    void visualHintsJoinTheRankingAndAreReturnedInSimilarityOrder() {
        UUID wineryId = UUID.randomUUID();
        UUID otherWineryId = UUID.randomUUID();
        Wine reserva = wine("Reserva Malbec", wineryId, "Malbec");
        Wine lookalike = wine("Gran Cuvee", otherWineryId, "Cabernet Sauvignon");
        ExtractedWineLabel label = label("Casa Sur", "Reserva Malbec", "Malbec",
                "Casa Sur Reserva Malbec", List.of("CASA SUR", "RESERVA MALBEC"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(reserva));
        when(candidateRetriever.retrieveByIds(List.of(lookalike.getId()))).thenReturn(List.of(lookalike));
        when(wineryQueryPort.findAllByIds(any())).thenReturn(List.of(
                winery(wineryId, "Casa Sur"), winery(otherWineryId, "Bodega Norte")));

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label,
                new WineLabelScanDeadline(Duration.ofSeconds(10)), List.of(
                        new WineVisualIndexPort.VisualMatch(lookalike.getId(), 0.91),
                        new WineVisualIndexPort.VisualMatch(reserva.getId(), 0.72)));

        assertThat(result.ranked().getFirst().candidate().wine()).isSameAs(reserva);
        assertThat(result.visual()).extracting(visual -> visual.candidate().id())
                .containsExactly(lookalike.getId(), reserva.getId());
        assertThat(result.visual()).extracting(WineLabelCatalogMatcher.VisualCandidate::similarity)
                .containsExactly(0.91, 0.72);
        assertThat(result.visual().getFirst().candidate().wineryName()).isEqualTo("Bodega Norte");
    }

    @Test
    void withoutVisualHintsNothingIsLookedUpById() {
        UUID wineryId = UUID.randomUUID();
        Wine reserva = wine("Reserva Malbec", wineryId, "Malbec");
        ExtractedWineLabel label = label("Casa Sur", "Reserva Malbec", "Malbec",
                "Casa Sur Reserva Malbec", List.of("CASA SUR", "RESERVA MALBEC"));
        when(candidateRetriever.retrieve(eq(label), any())).thenReturn(List.of(reserva));
        when(wineryQueryPort.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery(wineryId, "Casa Sur")));

        WineLabelCatalogMatcher.MatchResult result = matcher.match(label);

        assertThat(result.visual()).isEmpty();
        verify(candidateRetriever, never()).retrieveByIds(any());
    }

    private Wine wine(String name, UUID wineryId, String grape) {
        Wine wine = Wine.create(name, wineryId, WineType.RED, UUID.randomUUID());
        wine.updateGrapes(List.of(grape));
        return wine;
    }

    private WineryQueryPort.WineryData winery(UUID id, String name) {
        return new WineryQueryPort.WineryData(
                id,
                name,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    private ExtractedWineLabel label(
            String winery,
            String name,
            String grape,
            String searchKeywords,
            List<String> observedText) {
        return new ExtractedWineLabel(
                winery,
                name,
                grape,
                null,
                "RED",
                null,
                null,
                null,
                0.95,
                searchKeywords,
                null,
                true,
                observedText);
    }
}
