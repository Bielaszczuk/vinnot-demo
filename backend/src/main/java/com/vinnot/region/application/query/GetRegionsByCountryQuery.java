package com.vinnot.region.application.query;

import com.vinnot.region.application.dto.RegionResponse;
import com.vinnot.shared.application.query.Query;

import java.util.List;
import java.util.UUID;

public record GetRegionsByCountryQuery(UUID countryId) implements Query<List<RegionResponse>> {
}

