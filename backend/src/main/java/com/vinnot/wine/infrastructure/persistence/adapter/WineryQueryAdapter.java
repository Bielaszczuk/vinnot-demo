package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

/**
 * Driven adapter: implements {@link WineryQueryPort} by delegating to
 * the winery module's repository interface.
 * This adapter keeps the winery module dependency confined to infrastructure,
 * so wine's application layer never imports winery types directly.
 */
@Component("wineWineryQueryAdapter")
@RequiredArgsConstructor
public class WineryQueryAdapter implements WineryQueryPort {

    private final WineryRepositoryPort wineryRepository;

    @Override
    public Optional<WineryData> findById(UUID id) {
        return wineryRepository.findById(id).map(this::toData);
    }

    @Override
    public List<WineryData> findAllByIds(List<UUID> ids) {
        return wineryRepository.findAllByIds(ids).stream()
                .map(this::toData)
                .toList();
    }

    private WineryData toData(Winery winery) {
        return new WineryData(
                winery.getId(),
                winery.getName(),
                winery.getCountryName(),
                winery.getRegionName(),
                winery.getSubregion(),
                winery.getDescriptionEs(),
                Objects.nonNull(winery.getContactInfo())
                        ? winery.getContactInfo().getWebsite() : null,
                Objects.nonNull(winery.getContactInfo())
                        ? winery.getContactInfo().getEmail() : null,
                Objects.nonNull(winery.getContactInfo())
                        ? winery.getContactInfo().getPhone() : null,
                Objects.nonNull(winery.getLocation())
                        ? winery.getLocation().getAddress() : null,
                Objects.nonNull(winery.getLocation())
                        && Objects.nonNull(winery.getLocation().getCoordinates())
                        ? winery.getLocation().getCoordinates().getLatitude() : null,
                Objects.nonNull(winery.getLocation())
                        && Objects.nonNull(winery.getLocation().getCoordinates())
                        ? winery.getLocation().getCoordinates().getLongitude() : null,
                winery.getLogoUrl(),
                winery.getEstablishedYear()
        );
    }
}
