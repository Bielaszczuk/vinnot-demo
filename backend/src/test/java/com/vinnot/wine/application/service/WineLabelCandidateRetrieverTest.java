package com.vinnot.wine.application.service;

import com.vinnot.wine.application.exception.WineLabelCatalogSearchTimeoutException;
import com.vinnot.wine.application.port.out.WineLabelSearchCriteria;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;

class WineLabelCandidateRetrieverTest {

    @Test
    void retrievesDetachedProductLinesTogetherWithTheObservedProducer() {
        var label = new ExtractedWineLabel("Tapiz", "Reserve Malbec", "Malbec", 2012,
                "RED", "Mendoza", "Argentina", null, 0.9, "Tapiz Reserve Malbec", null, true,
                List.of("TAPIZ", "RESERVE", "Malbec", "Premium", "Mendoza Argentina", "2012"));
        retriever.retrieve(label);
        var queries = ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository, atLeastOnce()).findByIndexedIdentity(queries.capture());
        assertThat(queries.getAllValues()).anySatisfy(query ->
                assertThat(query.identityTerms()).containsExactly("Tapiz Premium"));
    }

    @Test
    void neverSearchesGenericDesignationLinesOnTheirOwn() {
        var label = new ExtractedWineLabel("Bodega Viva", "Isabella", "Pinot Noir", 2012, "RED",
                "Mendoza", "Argentina", null, 0.9, null, null, true,
                List.of("Edición Limitada", "ESTATE GROWN PINOT NOIR", "VINO FINO TINTO", "OLD VINE BLEND",
                        "Isabella Reserva", "PINOT NOIR", "MENDOZA ARGENTINA"));
        retriever.retrieve(label);
        var queries = ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository, atLeastOnce()).findByIndexedIdentity(queries.capture());
        var standalone = queries.getAllValues().stream()
                .map(query -> query.identityTerms().getFirst()).toList();
        assertThat(standalone).contains("Isabella", "Bodega Viva")
                .doesNotContain("Edición Limitada", "ESTATE GROWN PINOT NOIR", "VINO FINO TINTO", "OLD VINE BLEND");
    }

    @Test
    void retrievesTheIdentifiedProducersCatalogBeforeRanking() {
        var producerWine = Wine.create("Gran Reserva Blend", null, WineType.RED, UUID.randomUUID());
        when(wineRepository.findByProducerIdentity(any())).thenReturn(List.of(producerWine));
        var label = new ExtractedWineLabel("MEVI", "Gran Reserva", "Blend", 2014, "RED", null, null,
                null, 0.9, null, null, true, List.of("MEVI", "GRAN RESERVA"));

        assertThat(retriever.retrieve(label)).contains(producerWine);
        var query = ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository).findByProducerIdentity(query.capture());
        assertThat(query.getValue().identityTerms()).containsExactly("mevi");
        assertThat(query.getValue().limit()).isEqualTo(150);
    }

    @Test
    void skipsProducerRetrievalWithoutADistinctiveProducer() {
        for (String winery : new String[] {null, " ", "Bodega", "Finca La", "Viñedos y Bodegas", "Sur",
                "MALBEC", "Gran Reserva"}) {
            var label = new ExtractedWineLabel(winery, "Malbec Reserva", "Malbec", null, "RED", null, null,
                    null, 0.9, null, null, true, List.of("MALBEC RESERVA"));
            retriever.retrieve(label);
        }
        verify(wineRepository, never()).findByProducerIdentity(any());
    }

    @Test
    void producerRetrievalTimeoutDoesNotHideOtherCandidates() {
        var indexed = Wine.create("Malbec", null, WineType.RED, UUID.randomUUID());
        when(wineRepository.findByProducerIdentity(any()))
                .thenThrow(new WineLabelCatalogSearchTimeoutException(new RuntimeException()));
        when(wineRepository.findByIndexedIdentity(any())).thenReturn(List.of(indexed));
        var label = new ExtractedWineLabel("Altamonte", "Malbec", "Malbec", null, "RED", null, null,
                null, 0.9, null, null, true, List.of("ALTAMONTE"));
        assertThat(retriever.retrieve(label)).containsExactly(indexed);
    }

    @Test
    void prioritizesObservedNumberedProductsOverCombinedOriginAndAlcoholLines() {
        var label = new ExtractedWineLabel("San Felipe", "Brand", null, null, "RED", "Mendoza", "Argentina",
                null, 0.9, "Brand", null, true,
                List.of("Mendoza Argentina", "12 UVAS", "13 vol", "750 ml", "2020 Reserva"));
        retriever.retrieve(label);
        var queries = ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository, atLeastOnce()).findByIndexedIdentity(queries.capture());
        assertThat(queries.getAllValues().getFirst().identityTerms()).containsExactly("12 UVAS");
        assertThat(queries.getAllValues()).noneSatisfy(query ->
                assertThat(query.identityTerms()).contains("Mendoza Argentina"));
    }

    @Test
    void approximateSupplementRetainsDeadlineAndReportsTimeout() {
        var port = mock(WineRepositoryPort.class);
        var service = new WineLabelCandidateRetriever(port);
        var label = new ExtractedWineLabel("Producer", "13.Cabernet", null, null,
                null, null, null, null, 0.9, null, null, true, List.of());
        var wine = Wine.create("13. Cabernet", null, WineType.RED, UUID.randomUUID());
        when(port.findByFuzzyMatch(any())).thenReturn(List.of(wine));
        assertThat(service.retrieveApproximate(label, new WineLabelScanDeadline(WineLabelScanDeadline.DEFAULT_BUDGET)))
                .containsExactly(wine);
        var query = ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(port).findByFuzzyMatch(query.capture());
        assertThat(query.getValue().identityTerms()).containsExactly("Producer");
        when(port.findByFuzzyMatch(any())).thenThrow(new WineLabelCatalogSearchTimeoutException(new RuntimeException()));
        assertThatThrownBy(() -> service.retrieveApproximate(label,
                new WineLabelScanDeadline(WineLabelScanDeadline.DEFAULT_BUDGET)))
                .extracting("code").isEqualTo("LABEL_CATALOG_UNAVAILABLE");
        var anonymous = new ExtractedWineLabel(null, "13.Cabernet", null, null,
                null, null, null, null, 0.9, null, null, true, List.of());
        doReturn(List.of(wine)).when(port).findByFuzzyMatch(any());
        assertThat(service.retrieveApproximate(anonymous,
                new WineLabelScanDeadline(WineLabelScanDeadline.DEFAULT_BUDGET))).containsExactly(wine);
    }

    @Test
    void visualHintsAreLoadedInTheirOrderAndInactiveOrMissingWinesAreDropped() {
        Wine first = Wine.create("Gran Cuvee", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        Wine second = Wine.create("Reserva Malbec", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        Wine inactive = Wine.create("Old Label", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        inactive.deactivate();
        UUID missing = UUID.randomUUID();
        List<UUID> ids = List.of(second.getId(), missing, inactive.getId(), first.getId());
        when(wineRepository.findAllByIds(ids)).thenReturn(List.of(first, inactive, second));

        assertThat(retriever.retrieveByIds(ids)).containsExactly(second, first);
        assertThat(retriever.retrieveByIds(List.of())).isEmpty();
        verify(wineRepository, times(1)).findAllByIds(any());
    }

    private final WineRepositoryPort wineRepository = mock(WineRepositoryPort.class);
    private final WineLabelCandidateRetriever retriever =
            new WineLabelCandidateRetriever(wineRepository);

    @Test
    void boundsPrimaryIdentityEvidenceToTwoHighValueTerms() {
        Wine target = Wine.create(
                "Chupasangre Malbec Rose",
                UUID.randomUUID(),
                WineType.ROSE,
                UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                "CHUPASANGRE",
                "ROSE DE MALBEC",
                "Malbec",
                2021,
                "ROSE",
                "Mendoza",
                "Argentina",
                null,
                0.95,
                "CHUPASANGRE ROSE DE MALBEC",
                null,
                true,
                List.of("CHUPASANGRE", "ROSE DE MALBEC", "MENDOZA ARGENTINA"));
        when(wineRepository.findByFuzzyMatch(any()))
                .thenAnswer(invocation -> {
                    WineLabelSearchCriteria criteria = invocation.getArgument(0);
                    return criteria.identityTerms().contains("CHUPASANGRE")
                            ? List.of(target) : List.of();
                });

        List<Wine> result = retriever.retrieve(label);

        ArgumentCaptor<WineLabelSearchCriteria> criteria =
                ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository).findByFuzzyMatch(criteria.capture());
        assertThat(criteria.getValue().identityTerms())
                .containsExactly(
                        "ROSE DE MALBEC",
                        "CHUPASANGRE");
        assertThat(result).containsExactly(target);
    }

    @Test
    void deDuplicatesCandidatesReturnedByMultipleStrategies() {
        Wine target = Wine.create(
                "Single Vineyard Cabernet Franc",
                UUID.randomUUID(),
                WineType.RED,
                UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                "EPITOME",
                "Cabernet Franc",
                "Cabernet Franc",
                null,
                "RED",
                null,
                "Argentina",
                null,
                0.95,
                "EPITOME Cabernet Franc",
                null,
                true,
                List.of("EPITOME", "SINGLE VINEYARD", "CABERNET FRANC"));
        when(wineRepository.findByFuzzyMatch(any())).thenReturn(List.of(target));

        assertThat(retriever.retrieve(label)).containsExactly(target);
    }

    @Test
    void retrievesDistinctiveObservedLinesThroughTheBoundedIndexPath() {
        Wine target = Wine.create(
                "Black Tears Malbec",
                UUID.randomUUID(),
                WineType.RED,
                UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, null, null, 2020, null,
                null, null, null, 0.95,
                null, null, true,
                List.of("BLACK TEARS", "TAPIZ", "MALBEC", "2020"));
        when(wineRepository.findByFuzzyMatch(any())).thenReturn(List.of());
        when(wineRepository.findByIndexedIdentity(any())).thenReturn(List.of(target));

        assertThat(retriever.retrieve(label)).containsExactly(target);

        ArgumentCaptor<WineLabelSearchCriteria> criteria =
                ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository, times(3)).findByIndexedIdentity(criteria.capture());
        verify(wineRepository, never()).findByFuzzyMatch(any());
        assertThat(criteria.getAllValues())
                .extracting(WineLabelSearchCriteria::identityTerms)
                .containsExactly(
                        List.of("BLACK TEARS"),
                        List.of("MALBEC"),
                        List.of("TAPIZ"));
    }

    @Test
    void continuesAfterABroadMetadataTermTimesOut() {
        Wine target = Wine.create(
                "Black Tears Malbec",
                UUID.randomUUID(),
                WineType.RED,
                UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                "Tapiz", "Reserva", "Malbec", 2020, "RED",
                "Mendoza", "Argentina", null, 0.95,
                "Tapiz Reserva Malbec", null, true,
                List.of("MALBEC", "BLACK TEARS", "TAPIZ"));
        when(wineRepository.findByIndexedIdentity(any()))
                .thenAnswer(invocation -> {
                    WineLabelSearchCriteria criteria = invocation.getArgument(0);
                    if (criteria.identityTerms().equals(List.of("Tapiz Reserva Malbec"))) {
                        throw new WineLabelCatalogSearchTimeoutException(
                                new RuntimeException("broad term timeout"));
                    }
                    return criteria.identityTerms().equals(List.of("Tapiz"))
                            ? List.of(target) : List.of();
                });

        assertThat(retriever.retrieve(label)).containsExactly(target);

        ArgumentCaptor<WineLabelSearchCriteria> criteria =
                ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository, times(4))
                .findByIndexedIdentity(criteria.capture());
        // A generic designation such as "Reserva" is never searched on its own.
        assertThat(criteria.getAllValues())
                .extracting(WineLabelSearchCriteria::identityTerms)
                .containsExactly(
                        List.of("Tapiz Reserva Malbec"),
                        List.of("Tapiz"),
                        List.of("BLACK TEARS"),
                        List.of("Tapiz BLACK TEARS"))
                .doesNotContain(List.of("Malbec"));
    }

    @Test
    void accumulatesDistinctiveCandidatesAfterABroadIdentityAlreadyMatched() {
        Wine generic = Wine.create(
                "Malbec", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        Wine expected = Wine.create(
                "Black Tears Malbec", UUID.randomUUID(),
                WineType.RED, UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                "Tapiz", null, "Malbec", 2020, "RED",
                "Mendoza", "Argentina", null, 0.95,
                null, null, true, List.of("BLACK TEARS", "MALBEC"));
        when(wineRepository.findByIndexedIdentity(any()))
                .thenAnswer(invocation -> {
                    WineLabelSearchCriteria criteria = invocation.getArgument(0);
                    return switch (criteria.identityTerms().getFirst()) {
                        case "Tapiz" -> List.of(generic);
                        case "BLACK TEARS" -> List.of(expected);
                        default -> List.of();
                    };
                });

        assertThat(retriever.retrieve(label)).containsExactly(generic, expected);
        verify(wineRepository, times(3)).findByIndexedIdentity(any());
        verify(wineRepository, never()).findByFuzzyMatch(any());
    }

    @Test
    void skipsEmptySpecializedStrategiesAfterBuildingThePrimarySearch() {
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, "Malbec", null, null, null, null, null, null,
                0.9, null, null, true, List.of(" ", "2022", "ab"));

        List<WineLabelSearchCriteria> criteria = retriever.retrievalCriteria(label);

        assertThat(criteria).hasSize(1);
        assertThat(criteria.getFirst().identityTerms()).containsExactly("Malbec");
        assertThat(criteria.getFirst().limit()).isEqualTo(60);
    }

    @Test
    void skipsIndexedRetrievalWhenTheLabelHasNoUsefulIdentityEvidence() {
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, null, null, null, null, null, null, null,
                0.5, null, null, true, List.of(" ", "ab"));
        when(wineRepository.findByFuzzyMatch(any())).thenReturn(List.of());

        assertThat(retriever.retrieve(label)).isEmpty();

        verify(wineRepository, never()).findByIndexedIdentity(any());
    }

    @Test
    void retrievesNumericProductIdentitiesWithoutTreatingThemAsVintages() {
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, "1492 Blanco", null, 2018, "WHITE", null, "Argentina",
                null, 0.9, "1492", null, true, List.of("1492", "2018"));

        List<WineLabelSearchCriteria> criteria = retriever.retrievalCriteria(label);

        assertThat(criteria)
                .flatExtracting(WineLabelSearchCriteria::identityTerms)
                .contains("1492 Blanco", "1492")
                .doesNotContain("2018");
    }

    @Test
    void usesTheDedicatedRepositoryPathForCompoundCommercialIdentities() {
        Wine target = Wine.create(
                "100 X 100 Chenin Blanc", UUID.randomUUID(),
                WineType.WHITE, UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, "100X100 Chenin Blanc", "Chenin Blanc", 2014, "WHITE",
                null, "Argentina", null, 0.9, null, null, true, List.of());
        when(wineRepository.findByCommercialIdentity(any())).thenReturn(List.of(target));
        when(wineRepository.findByFuzzyMatch(any())).thenReturn(List.of());

        List<Wine> wines = retriever.retrieve(label);

        ArgumentCaptor<WineLabelSearchCriteria> criteria =
                ArgumentCaptor.forClass(WineLabelSearchCriteria.class);
        verify(wineRepository).findByCommercialIdentity(criteria.capture());
        assertThat(criteria.getValue().identityTerms()).containsExactly("100 x 100");
        assertThat(criteria.getValue().limit()).isEqualTo(60);
        assertThat(wines).containsExactly(target);
    }

    @Test
    void doesNotCallCommercialIdentitySearchWithoutAnIdentifier() {
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, "Malbec Reserva", "Malbec", null, "RED",
                null, "Argentina", null, 0.9, null, null, true, List.of());
        when(wineRepository.findByFuzzyMatch(any())).thenReturn(List.of());

        retriever.retrieve(label);

        verify(wineRepository, never()).findByCommercialIdentity(any());
    }

    @Test
    void returnsIndexedIdentityWithoutRunningTheExpensiveFuzzyFallback() {
        Wine target = Wine.create(
                "Facon Selection Cabernet Sauvignon",
                UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                "Bad Brothers", "Facon Selection Cabernet Sauvignon",
                "Cabernet Sauvignon", 2019, "RED", "Salta", "Argentina",
                null, 0.95, null, null, true,
                List.of("BAD BROTHERS", "FACON SELECTION"));
        when(wineRepository.findByIndexedIdentity(any())).thenReturn(List.of(target));

        assertThat(retriever.retrieve(label)).containsExactly(target);

        verify(wineRepository, atLeastOnce()).findByIndexedIdentity(any());
        verify(wineRepository, never()).findByFuzzyMatch(any());
    }

    @Test
    void reportsUnavailableRatherThanNoMatchWhenCatalogStrategiesTimeOut() {
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, "Unknown Label", null, null, null, null, null, null,
                0.8, null, null, true, List.of("UNKNOWN LABEL"));
        WineLabelCatalogSearchTimeoutException timeout =
                new WineLabelCatalogSearchTimeoutException(
                        new RuntimeException("timeout"));
        when(wineRepository.findByFuzzyMatch(any())).thenThrow(timeout);
        when(wineRepository.findByIndexedIdentity(any())).thenThrow(timeout);

        assertThatThrownBy(() -> retriever.retrieve(label))
                .isInstanceOf(ExternalServiceUnavailableException.class)
                .extracting("code").isEqualTo("LABEL_CATALOG_UNAVAILABLE");
    }

    @Test
    void continuesWithGeneralRetrievalWhenCommercialSearchTimesOut() {
        Wine target = Wine.create(
                "100 X 100 Chenin Blanc", UUID.randomUUID(),
                WineType.WHITE, UUID.randomUUID());
        ExtractedWineLabel label = new ExtractedWineLabel(
                null, "100X100 Chenin Blanc", "Chenin Blanc", 2014, "WHITE",
                null, "Argentina", null, 0.9, null, null, true, List.of());
        when(wineRepository.findByCommercialIdentity(any()))
                .thenThrow(new WineLabelCatalogSearchTimeoutException(
                        new RuntimeException("timeout")));
        when(wineRepository.findByFuzzyMatch(any())).thenReturn(List.of(target));

        assertThat(retriever.retrieve(label)).containsExactly(target);
    }
}
