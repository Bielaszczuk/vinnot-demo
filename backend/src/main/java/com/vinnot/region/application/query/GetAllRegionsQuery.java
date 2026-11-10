package com.vinnot.region.application.query;

import com.vinnot.region.application.dto.RegionResponse;
import com.vinnot.shared.application.query.Query;

import java.util.List;

public record GetAllRegionsQuery() implements Query<List<RegionResponse>> {
}

