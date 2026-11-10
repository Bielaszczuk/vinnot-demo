package com.vinnot.winery.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.application.query.model.SearchWineriesQuery;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

class SearchWineriesQueryHandlerTest {

    private final WineryRepositoryPort repository = mock(WineryRepositoryPort.class);
    private final SearchWineriesQueryHandler handler = new SearchWineriesQueryHandler(repository);

    @Test
    void delegatesFiltersAndPreservesPageMetadataWhileMapping() {
        Winery winery = Winery.create("Catena", UUID.randomUUID());
        when(repository.search("cat", "Argentina", "Mendoza", PageQuery.of(1, 10)))
                .thenReturn(PageResult.of(List.of(winery), 1, 10, 11));

        when(repository.countActiveWinesByWineryIds(List.of(winery.getId())))
                .thenReturn(Map.of(winery.getId(), 7));
        var result = handler.execute(new SearchWineriesQuery(
                "cat", "Argentina", "Mendoza", 1, 10));

        assertThat(result.content().getFirst().winesCount()).isEqualTo(7);
        verify(repository).countActiveWinesByWineryIds(List.of(winery.getId()));
        assertThat(result.totalPages()).isEqualTo(2);
        assertThat(result.content()).singleElement()
                .extracting("name").isEqualTo("Catena");
    }

    @Test
    void exposesTheFoundingYearSoTheAdminListCanShowIt() {
        Winery founded = Winery.create("Catena", UUID.randomUUID());
        founded.setEstablishedYear(1902);
        Winery unknown = Winery.create("Nueva", UUID.randomUUID());
        when(repository.search(null, null, null, PageQuery.of(0, 10)))
                .thenReturn(PageResult.of(List.of(founded, unknown), 0, 10, 2));
        when(repository.countActiveWinesByWineryIds(List.of(founded.getId(), unknown.getId())))
                .thenReturn(Map.of());

        var result = handler.execute(new SearchWineriesQuery(null, null, null, 0, 10));

        assertThat(result.content()).extracting("establishedYear").containsExactly(1902, null);
    }
}
