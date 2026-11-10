package com.vinnot.cellar.application.query.handler;

import com.vinnot.cellar.application.port.in.GetCellarStatsUseCase;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.application.port.out.WineQueryPort;
import com.vinnot.cellar.application.query.model.GetCellarStatsQuery;
import com.vinnot.cellar.application.query.response.CellarStatsResponse;
import com.vinnot.cellar.domain.model.CellarWine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetCellarStatsQueryHandler implements GetCellarStatsUseCase {

    private final CellarWineRepositoryPort cellarWineRepository;
    private final WineQueryPort wineQueryPort;

    @Override
    @Transactional(readOnly = true)
    public CellarStatsResponse execute(GetCellarStatsQuery query) {
        List<CellarWine> entries = cellarWineRepository.findAllByUserId(query.userId());

        int totalWines = entries.size();

        int ratedWines = (int) entries.stream()
                .filter(e -> Objects.nonNull(e.getRating()))
                .count();

        double averageRating = entries.stream()
                .filter(e -> Objects.nonNull(e.getRating()))
                .mapToDouble(entry -> entry.getRating().doubleValue())
                .average()
                .orElse(0.0);

        Map<String, Integer> byType = new HashMap<>();
        List<WineQueryPort.WineDetailData> wines = wineQueryPort.findAllByIds(
                entries.stream().map(CellarWine::getWineId).toList());
        wines.forEach(wine -> {
            String type = Objects.nonNull(wine.wineType()) ? wine.wineType() : "UNKNOWN";
            byType.merge(type, 1, Integer::sum);
        });

        long uniqueWineries = wines.stream()
                .map(WineQueryPort.WineDetailData::wineryName)
                .filter(name -> Objects.nonNull(name) && !name.isBlank())
                .distinct()
                .count();
        long uniqueRegions = wines.stream()
                .map(WineQueryPort.WineDetailData::region)
                .filter(region -> Objects.nonNull(region) && !region.isBlank())
                .distinct()
                .count();

        return new CellarStatsResponse(
                totalWines,
                ratedWines,
                averageRating,
                (int) uniqueWineries,
                (int) uniqueRegions,
                byType
        );
    }
}
