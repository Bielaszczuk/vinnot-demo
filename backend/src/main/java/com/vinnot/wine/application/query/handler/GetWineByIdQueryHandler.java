package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.in.GetWineByIdUseCase;
import com.vinnot.wine.application.port.out.WineProfileOverviewPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.query.model.GetWineByIdQuery;
import com.vinnot.wine.application.query.response.WineDetailsResponse;
import com.vinnot.wine.domain.model.Wine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * Handler for GetWineByIdQuery.
 * Implements {@link GetWineByIdUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetWineByIdQueryHandler implements GetWineByIdUseCase {

    private final WineRepositoryPort wineRepository;
    private final WineryQueryPort wineryQueryPort;
    private final WineProfileOverviewPort profileOverviewPort;

    @Override
    @Transactional(readOnly = true)
    public WineDetailsResponse execute(GetWineByIdQuery query) {
        Wine wine = wineRepository.findById(query.wineId())
                .filter(value -> query.reader().mayRead(value.isActive(), value.getCreatedBy()))
                .orElseThrow(() -> new EntityNotFoundException("Wine", query.wineId()));

        WineDetailsResponse.WineryInfo wineryInfo = null;
        String wineryName = null;
        String region = null;
        String country = null;

        if (Objects.nonNull(wine.getWineryId())) {
            WineryQueryPort.WineryData winery =
                    wineryQueryPort.findById(wine.getWineryId()).orElse(null);
            if (Objects.nonNull(winery)) {
                wineryName = winery.name();
                region = winery.regionName();
                country = winery.countryName();
                wineryInfo = new WineDetailsResponse.WineryInfo(
                        winery.id(),
                        winery.name(),
                        winery.countryName(),
                        winery.regionName(),
                        winery.subregion(),
                        winery.descriptionEs(),
                        winery.websiteUrl(),
                        winery.contactEmail(),
                        winery.contactPhone(),
                        winery.address(),
                        winery.latitude(),
                        winery.longitude(),
                        winery.logoUrl(),
                        winery.establishedYear()
                );
            }
        }

        return WineDetailsResponse.fromDomain(
                wine, wineryName, region, country, false, wineryInfo, profileOverviewPort.findByWineId(wine.getId()));
    }
}
