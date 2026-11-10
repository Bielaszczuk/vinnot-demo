package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetRecentWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.port.in.GetRecentWinesUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetRecentWinesQuery.
 * Implements {@link GetRecentWinesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetRecentWinesQueryHandler implements GetRecentWinesUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSummaryResponse> execute(GetRecentWinesQuery query) {
        return wineRepository.findRecent(PageQuery.of(query.page(), query.size(), "createdAt", PageQuery.SortDirection.DESC))
                .map(WineSummaryResponse::fromDomain);
    }
}

