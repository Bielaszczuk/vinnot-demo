package com.vinnot.region.domain.repository;

import com.vinnot.region.domain.model.Region;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RegionRepository {

    List<Region> findAll();

    Optional<Region> findById(UUID id);

    List<Region> findByCountryId(UUID countryId);
}

