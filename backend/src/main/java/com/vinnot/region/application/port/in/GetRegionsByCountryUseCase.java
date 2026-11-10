package com.vinnot.region.application.port.in;

import com.vinnot.region.application.dto.RegionResponse;

import java.util.List;
import java.util.UUID;

public interface GetRegionsByCountryUseCase {

    List<RegionResponse> getRegionsByCountry(UUID countryId);
}
