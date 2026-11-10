package com.vinnot.region.infrastructure.persistence.repository;

import com.vinnot.region.infrastructure.persistence.entity.CountryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CountryJpaRepository extends JpaRepository<CountryJpaEntity, UUID> {

    /**
     * Finds a country by its code.
     *
     * @param code the country code (e.g., "ar")
     * @return the country if found
     */
    Optional<CountryJpaEntity> findByCode(String code);

    /**
     * Checks if a country exists by code.
     *
     * @param code the country code
     * @return true if exists
     */
    boolean existsByCode(String code);
}

