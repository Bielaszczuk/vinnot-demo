package com.vinnot.wineroute.infrastructure.web.controller;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import com.vinnot.wineroute.application.port.in.AddRouteStopUseCase;
import com.vinnot.wineroute.application.port.in.CreateWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteCountriesUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteHierarchyUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteRegionsUseCase;
import com.vinnot.wineroute.application.port.in.GetRouteSubregionsUseCase;
import com.vinnot.wineroute.application.port.in.GetWineRouteByIdUseCase;
import com.vinnot.wineroute.application.port.in.SearchWineRoutesUseCase;
import com.vinnot.wineroute.application.query.model.SearchWineRoutesQuery;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WineRouteControllerTest {

    private final SearchWineRoutesUseCase search = mock(SearchWineRoutesUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new WineRouteController(
                    mock(CreateWineRouteUseCase.class), mock(AddRouteStopUseCase.class),
                    mock(GetWineRouteByIdUseCase.class), search, mock(GetRouteCountriesUseCase.class),
                    mock(GetRouteRegionsUseCase.class), mock(GetRouteSubregionsUseCase.class),
                    mock(GetRouteHierarchyUseCase.class)))
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void bindsTheDifficultyTogetherWithTheOtherFilters() throws Exception {
        when(search.execute(any())).thenReturn(PageResult.of(List.of(), 1, 10, 0));

        mvc.perform(get("/wine-routes").param("search", "malbec").param("country", "Argentina")
                        .param("region", "Mendoza").param("difficulty", "LONG")
                        .param("page", "1").param("size", "10"))
                .andExpect(status().isOk());

        assertThat(sentQuery()).isEqualTo(
                new SearchWineRoutesQuery("malbec", "Argentina", "Mendoza", RouteDifficulty.LONG, 1, 10));
    }

    @Test
    void withoutADifficultyTheSearchIsTheSameAsBefore() throws Exception {
        when(search.execute(any())).thenReturn(PageResult.of(List.of(), 0, 20, 0));

        mvc.perform(get("/wine-routes").param("search", "malbec"))
                .andExpect(status().isOk());

        assertThat(sentQuery()).isEqualTo(new SearchWineRoutesQuery("malbec", null, null, null, 0, 20));
    }

    @Test
    void anUnknownDifficultyIsAnInvalidRequest() throws Exception {
        mvc.perform(get("/wine-routes").param("difficulty", "EXTREME"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        verifyNoInteractions(search);
    }

    private SearchWineRoutesQuery sentQuery() {
        ArgumentCaptor<SearchWineRoutesQuery> query = ArgumentCaptor.forClass(SearchWineRoutesQuery.class);
        verify(search).execute(query.capture());
        return query.getValue();
    }
}
