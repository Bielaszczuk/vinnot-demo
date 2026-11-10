package com.vinnot.wineroute.infrastructure.persistence.adapter;

import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.wineroute.application.port.out.WineryQueryPort;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Adapter that implements WineryQueryPort for cross-module winery lookups.
 * Located in infrastructure to encapsulate the dependency on winery module internals.
 */
@Component("winerouteWineryQueryAdapter")
@RequiredArgsConstructor
public class WineryQueryAdapter implements WineryQueryPort {

    private final WineryRepositoryPort wineryRepository;

    @Override
    public List<WineryDetailData> findByExactNames(List<String> names) {
        if (names.isEmpty()) {
            return List.of();
        }
        return wineryRepository.findActiveByExactNames(names).stream()
                .map(WineryQueryAdapter::toDetail)
                .toList();
    }

    private static WineryDetailData toDetail(Winery winery) {
        String email = null;
        String phone = null;
        String website = null;
        String address = null;

        if (Objects.nonNull(winery.getContactInfo())) {
            email = winery.getContactInfo().getEmail();
            phone = winery.getContactInfo().getPhone();
            website = winery.getContactInfo().getWebsite();
        }
        if (Objects.nonNull(winery.getLocation())) {
            address = winery.getLocation().getAddress();
        }

        return new WineryDetailData(
                winery.getId(),
                winery.getName(),
                winery.getCountryName(),
                winery.getRegionName(),
                winery.getSubregion(),
                winery.getDescriptionEs(),
                website,
                winery.getLogoUrl(),
                winery.getEstablishedYear(),
                email,
                phone,
                address
        );
    }
}
