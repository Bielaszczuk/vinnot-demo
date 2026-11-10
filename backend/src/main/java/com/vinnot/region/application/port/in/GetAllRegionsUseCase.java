package com.vinnot.region.application.port.in;

import com.vinnot.region.application.dto.RegionResponse;

import java.util.List;

public interface GetAllRegionsUseCase {

    List<RegionResponse> getAllRegions();
}
