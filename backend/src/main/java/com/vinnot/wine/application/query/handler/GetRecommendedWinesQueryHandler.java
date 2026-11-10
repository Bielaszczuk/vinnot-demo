package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetRecommendedWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.port.in.GetRecommendedWinesUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetRecommendedWinesQuery.
 * Implements {@link GetRecommendedWinesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetRecommendedWinesQueryHandler
        implements GetRecommendedWinesUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSummaryResponse> execute(GetRecommendedWinesQuery query) {
        return wineRepository.findRecommended(PageQuery.of(query.page(), query.size()))
                .map(WineSummaryResponse::fromDomain);
    }
}

