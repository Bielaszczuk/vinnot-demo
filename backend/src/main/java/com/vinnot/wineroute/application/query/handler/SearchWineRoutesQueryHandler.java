package com.vinnot.wineroute.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wineroute.application.port.in.SearchWineRoutesUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.query.model.SearchWineRoutesQuery;
import com.vinnot.wineroute.application.query.response.WineRouteSummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.vinnot.wineroute.domain.model.WineRoute;

/**
 * Handler for SearchWineRoutesQuery.
 */
@Service
@RequiredArgsConstructor
public class SearchWineRoutesQueryHandler implements SearchWineRoutesUseCase {

    private static final int MAX_PAGE_SIZE = 100;

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineRouteSummaryResponse> execute(SearchWineRoutesQuery query) {
        var page = repository.search(
                query.searchTerm(),
                query.country(),
                query.region(),
                query.difficulty(),
                PageQuery.bounded(query.page(), query.size(), MAX_PAGE_SIZE)
        );
        var counts = repository.getStopCounts(page.content().stream().map(WineRoute::getId).toList());
        return page.map(route -> WineRouteSummaryResponse.fromDomain(route,
                counts.getOrDefault(route.getId(), new WineRouteRepositoryPort.StopCounts(0, 0))));
    }
}
