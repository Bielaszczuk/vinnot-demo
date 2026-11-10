package com.vinnot.region.application.port.in;

import com.vinnot.region.application.dto.CountryResponse;

import java.util.List;

public interface GetAllCountriesUseCase {

    List<CountryResponse> getAllCountries();
}
