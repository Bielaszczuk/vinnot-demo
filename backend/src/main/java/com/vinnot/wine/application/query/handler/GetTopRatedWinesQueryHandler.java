package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetTopRatedWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.port.in.GetTopRatedWinesUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetTopRatedWinesQuery.
 * Implements {@link GetTopRatedWinesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetTopRatedWinesQueryHandler implements GetTopRatedWinesUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSummaryResponse> execute(GetTopRatedWinesQuery query) {
        return wineRepository.findTopRated(PageQuery.of(query.page(), query.size()))
                .map(WineSummaryResponse::fromDomain);
    }
}

