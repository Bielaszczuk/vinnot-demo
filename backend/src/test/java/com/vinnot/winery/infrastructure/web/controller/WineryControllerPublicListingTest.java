package com.vinnot.winery.infrastructure.web.controller;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.winery.application.port.in.CreateWineryUseCase;
import com.vinnot.winery.application.port.in.DeleteWineryUseCase;
import com.vinnot.winery.application.port.in.GetWineryByIdUseCase;
import com.vinnot.winery.application.port.in.SearchWineriesUseCase;
import com.vinnot.winery.application.port.in.UpdateWineryCoordinatesUseCase;
import com.vinnot.winery.application.port.in.UpdateWineryUseCase;
import com.vinnot.winery.application.query.model.SearchWineriesQuery;
import com.vinnot.winery.application.query.response.WinerySummaryResponse;
import com.vinnot.winery.infrastructure.web.policy.PublicWineryCatalogAccessPolicy;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WineryControllerPublicListingTest {

    private final SearchWineriesUseCase search = mock(SearchWineriesUseCase.class);
    private final WineryController controller = new WineryController(
            mock(CreateWineryUseCase.class),
            mock(UpdateWineryUseCase.class),
            mock(DeleteWineryUseCase.class),
            mock(UpdateWineryCoordinatesUseCase.class),
            mock(GetWineryByIdUseCase.class),
            search,
            new PublicWineryCatalogAccessPolicy());

    @Test
    void capsThePublicListingAtTwentyPerPageAndFiveHundredResults() {
        when(search.execute(any())).thenReturn(PageResult.of(List.<WinerySummaryResponse>of(), 2, 20, 834));

        PageResult<WinerySummaryResponse> body =
                controller.search("malbec", "Argentina", "Mendoza", 2, 100).getBody();

        ArgumentCaptor<SearchWineriesQuery> query = ArgumentCaptor.forClass(SearchWineriesQuery.class);
        verify(search).execute(query.capture());
        assertThat(query.getValue()).isEqualTo(new SearchWineriesQuery("malbec", "Argentina", "Mendoza", 2, 20));
        assertThat(body.totalElements()).isEqualTo(500);
    }
}
