package com.vinnot.wineroute.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wineroute.application.port.in.SearchAllWineRoutesUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.query.model.SearchAllWineRoutesQuery;
import com.vinnot.wineroute.application.query.response.WineRouteSummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.vinnot.wineroute.domain.model.WineRoute;

/**
 * Handler for SearchAllWineRoutesQuery (admin, no status filter).
 */
@Service
@RequiredArgsConstructor
public class SearchAllWineRoutesQueryHandler implements SearchAllWineRoutesUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineRouteSummaryResponse> execute(SearchAllWineRoutesQuery query) {
        var page = repository.searchAll(
                query.searchTerm(),
                PageQuery.of(query.page(), query.size())
        );
        var counts = repository.getStopCounts(page.content().stream().map(WineRoute::getId).toList());
        return page.map(route -> WineRouteSummaryResponse.fromDomain(route,
                counts.getOrDefault(route.getId(), new WineRouteRepositoryPort.StopCounts(0, 0))));
    }
}
