package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.query.model.GetSimilarWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.port.in.GetSimilarWinesUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetSimilarWinesQuery.
 * Implements {@link GetSimilarWinesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetSimilarWinesQueryHandler implements GetSimilarWinesUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional(readOnly = true)
    public List<WineSummaryResponse> execute(GetSimilarWinesQuery query) {
        Wine wine = wineRepository.findById(query.wineId())
                .orElseThrow(() -> new EntityNotFoundException("Wine", query.wineId()));

        return wineRepository.findSimilar(wine.getWineType(), wine.getId(), query.limit())
                .stream()
                .map(WineSummaryResponse::fromDomain)
                .toList();
    }
}

