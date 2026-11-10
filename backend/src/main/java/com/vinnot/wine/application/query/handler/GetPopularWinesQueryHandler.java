package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetPopularWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.port.in.GetPopularWinesUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetPopularWinesQuery.
 * Implements {@link GetPopularWinesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetPopularWinesQueryHandler implements GetPopularWinesUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSummaryResponse> execute(GetPopularWinesQuery query) {
        return wineRepository.findPopular(PageQuery.of(query.page(), query.size()))
                .map(WineSummaryResponse::fromDomain);
    }
}

