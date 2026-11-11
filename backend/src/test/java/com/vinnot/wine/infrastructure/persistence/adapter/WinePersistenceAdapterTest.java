package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.region.infrastructure.persistence.repository.CountryJpaRepository;
import com.vinnot.region.infrastructure.persistence.repository.RegionJpaRepository;
import com.vinnot.wine.application.exception.WineLabelCatalogSearchTimeoutException;
import com.vinnot.wine.application.port.out.WineLabelSearchCriteria;
import com.vinnot.wine.infrastructure.persistence.jpa.WineJpaRepository;
import com.vinnot.wine.infrastructure.persistence.search.WineSearchNativeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WinePersistenceAdapterTest {

    private final WineSearchNativeRepository searchRepository =
            mock(WineSearchNativeRepository.class);
    private final WinePersistenceAdapter adapter = new WinePersistenceAdapter(
            mock(WineJpaRepository.class),
            mock(CountryJpaRepository.class),
            mock(RegionJpaRepository.class),
            searchRepository);
    private final WineLabelSearchCriteria criteria = new WineLabelSearchCriteria(
            List.of("Facon Selection"), null, null, null, 60);

    @Test
    void translatesFuzzyQueryTimeoutToApplicationException() {
        when(searchRepository.findByFuzzyMatch(
                anyList(), isNull(), isNull(), isNull(), anyInt()))
                .thenThrow(new QueryTimeoutException("timeout"));

        assertThatThrownBy(() -> adapter.findByFuzzyMatch(criteria))
                .isInstanceOf(WineLabelCatalogSearchTimeoutException.class)
                .hasCauseInstanceOf(QueryTimeoutException.class);
    }

    @Test
    void translatesIndexedQueryTimeoutToApplicationException() {
        when(searchRepository.findByIndexedIdentity(anyList(), anyInt()))
                .thenThrow(new QueryTimeoutException("timeout"));

        assertThatThrownBy(() -> adapter.findByIndexedIdentity(criteria))
                .isInstanceOf(WineLabelCatalogSearchTimeoutException.class)
                .hasCauseInstanceOf(QueryTimeoutException.class);
    }

    @Test
    void translatesCommercialQueryTimeoutToApplicationException() {
        when(searchRepository.findByCommercialIdentity(
                anyList(), isNull(), isNull(), isNull(), anyInt()))
                .thenThrow(new QueryTimeoutException("timeout"));

        assertThatThrownBy(() -> adapter.findByCommercialIdentity(criteria))
                .isInstanceOf(WineLabelCatalogSearchTimeoutException.class)
                .hasCauseInstanceOf(QueryTimeoutException.class);
    }

    @Test
    void readsTheProducerCatalogAndTranslatesItsTimeout() {
        var producer = new WineLabelSearchCriteria(List.of("mevi"), null, null, null, 150);
        when(searchRepository.findByProducerIdentity("mevi", 150)).thenReturn(List.of());
        assertThat(adapter.findByProducerIdentity(producer)).isEmpty();

        when(searchRepository.findByProducerIdentity("mevi", 150))
                .thenThrow(new QueryTimeoutException("timeout"));
        assertThatThrownBy(() -> adapter.findByProducerIdentity(producer))
                .isInstanceOf(WineLabelCatalogSearchTimeoutException.class)
                .hasCauseInstanceOf(QueryTimeoutException.class);
    }
}
