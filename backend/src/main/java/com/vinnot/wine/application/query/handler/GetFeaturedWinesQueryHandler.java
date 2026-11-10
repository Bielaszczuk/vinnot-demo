package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetFeaturedWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.port.in.GetFeaturedWinesUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetFeaturedWinesQuery.
 * Implements {@link GetFeaturedWinesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetFeaturedWinesQueryHandler implements GetFeaturedWinesUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSummaryResponse> execute(GetFeaturedWinesQuery query) {
        return wineRepository.findFeatured(PageQuery.of(query.page(), query.size()))
                .map(WineSummaryResponse::fromDomain);
    }
}

