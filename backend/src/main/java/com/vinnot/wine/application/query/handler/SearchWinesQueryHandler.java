package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.SearchWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.port.in.SearchWinesUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.domain.model.Wine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

/**
 * Handler for SearchWinesQuery.
 * Implements {@link SearchWinesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class SearchWinesQueryHandler implements SearchWinesUseCase {

    private final WineRepositoryPort wineRepository;
    private final WineryQueryPort wineryQueryPort;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSummaryResponse> execute(SearchWinesQuery query) {
        PageQuery pageQuery = PageQuery.of(query.page(), query.size());

        PageResult<Wine> winePage = wineRepository.searchAdvanced(
                query.searchTerm(),
                query.wineType(),
                query.wineryId(),
                query.country(),
                query.region(),
                query.grapeVariety(),
                pageQuery,
                query.includeInactive()
        );

        // Collect all winery IDs and fetch them in one batch query
        List<UUID> wineryIds = winePage.content().stream()
                .map(Wine::getWineryId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, WineryQueryPort.WineryData> wineryMap =
                wineryQueryPort.findAllByIds(wineryIds).stream()
                        .collect(Collectors.toMap(WineryQueryPort.WineryData::id, w -> w));

        return winePage.map(wine -> {
            WineryQueryPort.WineryData winery = Objects.nonNull(wine.getWineryId())
                    ? wineryMap.get(wine.getWineryId()) : null;
            return WineSummaryResponse.fromDomain(
                    wine,
                    Objects.nonNull(winery) ? winery.name() : null,
                    Objects.nonNull(winery) ? winery.regionName() : null,
                    Objects.nonNull(winery) ? winery.countryName() : null
            );
        });
    }
}
