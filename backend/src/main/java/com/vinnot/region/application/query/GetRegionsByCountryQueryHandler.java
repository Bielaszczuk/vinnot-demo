package com.vinnot.region.application.query;

import com.vinnot.region.application.dto.RegionResponse;
import com.vinnot.region.application.port.in.GetRegionsByCountryUseCase;
import com.vinnot.region.domain.repository.RegionRepository;
import com.vinnot.shared.application.query.QueryHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetRegionsByCountryQueryHandler implements
        QueryHandler<GetRegionsByCountryQuery, List<RegionResponse>>,
        GetRegionsByCountryUseCase {

    private final RegionRepository regionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RegionResponse> handle(GetRegionsByCountryQuery query) {
        return regionRepository.findByCountryId(query.countryId()).stream()
                .map(RegionResponse::fromDomain)
                .sorted((a, b) -> a.name().compareToIgnoreCase(b.name()))
                .toList();
    }

    @Override
    public List<RegionResponse> getRegionsByCountry(UUID countryId) {
        return handle(new GetRegionsByCountryQuery(countryId));
    }
}
