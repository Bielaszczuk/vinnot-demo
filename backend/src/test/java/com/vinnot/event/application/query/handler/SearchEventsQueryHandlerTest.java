package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.SearchEventsQuery;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchEventsQueryHandlerTest {

    @Mock
    private EventRepositoryPort eventRepository;

    @Test
    void delegatesCountryAndRegionFiltersToTheRepository() {
        SearchEventsQuery query = new SearchEventsQuery(
                "degustación",
                "TASTING",
                null,
                "Buenos Aires",
                "Argentina",
                1,
                20);
        PageQuery pageQuery = PageQuery.of(1, 20);
        when(eventRepository.search(
                "degustación",
                "TASTING",
                null,
                "Buenos Aires",
                "Argentina",
                pageQuery))
                .thenReturn(PageResult.empty());

        var result = new SearchEventsQueryHandler(eventRepository).execute(query);

        assertThat(result.content()).isEmpty();
        verify(eventRepository).search(
                "degustación",
                "TASTING",
                null,
                "Buenos Aires",
                "Argentina",
                pageQuery);
    }

    @Test
    void trimsTextFiltersAndConvertsBlankValuesToNull() {
        SearchEventsQuery query = new SearchEventsQuery(
                "  feria de vinos  ",
                null,
                "   ",
                "  Chubut ",
                " Argentina  ",
                0,
                20);
        PageQuery pageQuery = PageQuery.of(0, 20);
        when(eventRepository.search(
                "feria de vinos",
                null,
                null,
                "Chubut",
                "Argentina",
                pageQuery))
                .thenReturn(PageResult.empty());

        var result = new SearchEventsQueryHandler(eventRepository).execute(query);

        assertThat(result.content()).isEmpty();
        verify(eventRepository).search(
                "feria de vinos",
                null,
                null,
                "Chubut",
                "Argentina",
                pageQuery);
    }
}
