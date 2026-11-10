package com.vinnot.region.application.query;

import com.vinnot.region.application.dto.RegionResponse;
import com.vinnot.region.application.port.in.GetAllRegionsUseCase;
import com.vinnot.region.domain.repository.RegionRepository;
import com.vinnot.shared.application.query.QueryHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetAllRegionsQueryHandler implements
        QueryHandler<GetAllRegionsQuery, List<RegionResponse>>,
        GetAllRegionsUseCase {

    private final RegionRepository regionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RegionResponse> handle(GetAllRegionsQuery query) {
        return regionRepository.findAll().stream()
                .map(RegionResponse::fromDomain)
                .sorted((a, b) -> a.name().compareToIgnoreCase(b.name()))
                .toList();
    }

    @Override
    public List<RegionResponse> getAllRegions() {
        return handle(new GetAllRegionsQuery());
    }
}
