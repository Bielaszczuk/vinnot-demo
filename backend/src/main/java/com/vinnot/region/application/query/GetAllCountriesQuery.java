package com.vinnot.region.application.query;

import com.vinnot.region.application.dto.CountryResponse;
import com.vinnot.shared.application.query.Query;

import java.util.List;

public record GetAllCountriesQuery() implements Query<List<CountryResponse>> {
}

