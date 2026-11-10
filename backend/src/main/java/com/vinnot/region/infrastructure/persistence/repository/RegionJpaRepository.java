package com.vinnot.region.infrastructure.persistence.repository;

import com.vinnot.region.infrastructure.persistence.entity.RegionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RegionJpaRepository extends JpaRepository<RegionJpaEntity, UUID> {

    /**
     * Finds regions by country ID.
     *
     * @param countryId the country ID
     * @return list of regions
     */
    List<RegionJpaEntity> findByCountryId(UUID countryId);

    /**
     * Finds a region by name and country ID.
     *
     * @param name      the region name
     * @param countryId the country ID
     * @return the region if found
     */
    Optional<RegionJpaEntity> findByNameAndCountryId(String name, UUID countryId);

    /**
     * Finds regions by name (case-insensitive).
     *
     * @param name the region name
     * @return list of matching regions
     */
    List<RegionJpaEntity> findByNameIgnoreCase(String name);
}

