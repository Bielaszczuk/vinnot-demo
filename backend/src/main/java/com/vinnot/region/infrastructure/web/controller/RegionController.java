package com.vinnot.region.infrastructure.web.controller;

import com.vinnot.region.application.dto.CountryResponse;
import com.vinnot.region.application.dto.RegionResponse;
import com.vinnot.region.application.port.in.GetAllCountriesUseCase;
import com.vinnot.region.application.port.in.GetAllRegionsUseCase;
import com.vinnot.region.application.port.in.GetRegionsByCountryUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/regions")
@RequiredArgsConstructor
public class RegionController {

    private final GetAllCountriesUseCase getAllCountriesUseCase;
    private final GetAllRegionsUseCase getAllRegionsUseCase;
    private final GetRegionsByCountryUseCase getRegionsByCountryUseCase;

    /**
     * Gets all countries.
     *
     * @return list of countries
     */
    @GetMapping("/countries")
    public ResponseEntity<List<CountryResponse>> getAllCountries() {
        List<CountryResponse> countries = getAllCountriesUseCase.getAllCountries();
        return ResponseEntity.ok(countries);
    }

    /**
     * Gets all regions.
     *
     * @return list of regions
     */
    @GetMapping
    public ResponseEntity<List<RegionResponse>> getAllRegions() {
        List<RegionResponse> regions = getAllRegionsUseCase.getAllRegions();
        return ResponseEntity.ok(regions);
    }

    /**
     * Gets regions by country ID.
     *
     * @param countryId the country ID
     * @return list of regions for the country
     */
    @GetMapping("/country/{countryId}")
    public ResponseEntity<List<RegionResponse>> getRegionsByCountry(
            @PathVariable UUID countryId) {
        List<RegionResponse> regions = getRegionsByCountryUseCase
                .getRegionsByCountry(countryId);
        return ResponseEntity.ok(regions);
    }
}
