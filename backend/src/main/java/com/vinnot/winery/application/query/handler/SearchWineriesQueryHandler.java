package com.vinnot.winery.application.query.handler;

import com.vinnot.winery.domain.model.Winery;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.winery.application.port.in.SearchWineriesUseCase;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.application.query.model.SearchWineriesQuery;
import com.vinnot.winery.application.query.response.WinerySummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for SearchWineriesQuery.
 * Implements {@link SearchWineriesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class SearchWineriesQueryHandler implements SearchWineriesUseCase {

    private static final int MAX_PAGE_SIZE = 100;

    private final WineryRepositoryPort wineryRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WinerySummaryResponse> execute(SearchWineriesQuery query) {
        var wineries = wineryRepository.search(
                query.searchTerm(),
                query.country(),
                query.region(),
                PageQuery.bounded(query.page(), query.size(), MAX_PAGE_SIZE)
        );
        var counts = wineryRepository.countActiveWinesByWineryIds(wineries.content().stream()
                .map(Winery::getId).toList());
        return wineries.map(winery -> WinerySummaryResponse.fromDomain(
                winery, counts.getOrDefault(winery.getId(), 0)));
    }
}
