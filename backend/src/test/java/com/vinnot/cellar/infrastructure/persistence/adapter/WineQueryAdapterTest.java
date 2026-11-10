package com.vinnot.cellar.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WineQueryAdapterTest {

    private final WineRepositoryPort wines = mock(WineRepositoryPort.class);
    private final WineryRepositoryPort wineries = mock(WineryRepositoryPort.class);
    private final WineQueryAdapter adapter = new WineQueryAdapter(wines, wineries);

    @Test
    void batchLoadsWinesAndSharedWineriesWithoutIndividualLookups() {
        UUID wineryId = UUID.randomUUID();
        Wine first = Wine.create("First", wineryId, WineType.RED, UUID.randomUUID());
        Wine second = Wine.create("Second", wineryId, WineType.WHITE, UUID.randomUUID());
        List<UUID> wineIds = List.of(first.getId(), second.getId());
        Winery winery = Winery.builder()
                .id(wineryId)
                .name("Producer")
                .countryName("Argentina")
                .regionName("Mendoza")
                .build();
        when(wines.findAllByIds(wineIds)).thenReturn(List.of(first, second));
        when(wineries.findAllByIds(List.of(wineryId))).thenReturn(List.of(winery));

        var result = adapter.findAllByIds(wineIds);

        assertThat(result).hasSize(2)
                .allSatisfy(detail -> {
                    assertThat(detail.wineryName()).isEqualTo("Producer");
                    assertThat(detail.country()).isEqualTo("Argentina");
                    assertThat(detail.region()).isEqualTo("Mendoza");
                });
        verify(wines).findAllByIds(wineIds);
        verify(wineries).findAllByIds(List.of(wineryId));
        verify(wineries, never()).findById(wineryId);
    }

    @Test
    void skipsPersistenceForAnEmptyBatch() {
        assertThat(adapter.findAllByIds(List.of())).isEmpty();

        verifyNoInteractions(wines, wineries);
    }
}
