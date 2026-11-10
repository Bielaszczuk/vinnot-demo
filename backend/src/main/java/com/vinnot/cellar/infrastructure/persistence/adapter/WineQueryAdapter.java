package com.vinnot.cellar.infrastructure.persistence.adapter;

import com.vinnot.cellar.application.port.out.WineQueryPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.util.stream.Collectors;

@Component("cellarWineQueryAdapter")
@RequiredArgsConstructor
public class WineQueryAdapter implements WineQueryPort {

    private final WineRepositoryPort wineRepository;
    private final WineryRepositoryPort wineryRepository;

    @Override
    public Optional<WineDetailData> findById(UUID wineId) {
        return wineRepository.findById(wineId)
                .map(this::toWineDetailData);
    }

    @Override
    public List<WineDetailData> findAllByIds(Collection<UUID> wineIds) {
        if (wineIds.isEmpty()) {
            return List.of();
        }
        List<Wine> wines = wineRepository.findAllByIds(wineIds);
        List<UUID> wineryIds = wines.stream()
                .map(Wine::getWineryId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, Winery> wineriesById = wineryRepository.findAllByIds(wineryIds)
                .stream().collect(Collectors.toMap(
                        Winery::getId, winery -> winery));
        return wines.stream()
                .map(wine -> toWineDetailData(wine, wineriesById.get(wine.getWineryId())))
                .toList();
    }

    private WineDetailData toWineDetailData(Wine wine) {
        Winery winery = null;
        if (Objects.nonNull(wine.getWineryId())) {
            winery = wineryRepository.findById(wine.getWineryId()).orElse(null);
        }
        return toWineDetailData(wine, winery);
    }

    private WineDetailData toWineDetailData(Wine wine, Winery winery) {
        String wineryName = Objects.nonNull(winery) ? winery.getName() : "";
        String region = Objects.nonNull(winery) && Objects.nonNull(winery.getRegionName())
                ? winery.getRegionName() : "";
        String country = Objects.nonNull(winery) && Objects.nonNull(winery.getCountryName())
                ? winery.getCountryName() : "";

        return new WineDetailData(
                wine.getId(),
                wine.getName(),
                wine.getVintage(),
                Objects.nonNull(wine.getWineType()) ? wine.getWineType().name() : null,
                wine.getStyle(),
                Objects.nonNull(wine.getGrapes()) ? wine.getGrapes() : List.of(),
                wineryName,
                region,
                country,
                Objects.nonNull(wine.getPriceRange()) ? wine.getPriceRange().getMinPrice() : null,
                Objects.nonNull(wine.getPriceRange()) ? wine.getPriceRange().getMaxPrice() : null,
                wine.getImageUrl(),
                Objects.nonNull(wine.getRating()) ? wine.getRating().getAverage() : null
        );
    }
}
