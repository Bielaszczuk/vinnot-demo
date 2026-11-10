package com.vinnot.region.domain.repository;

import com.vinnot.region.domain.model.Country;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CountryRepository {

    List<Country> findAll();

    Optional<Country> findById(UUID id);

    Optional<Country> findByCode(String code);
}

