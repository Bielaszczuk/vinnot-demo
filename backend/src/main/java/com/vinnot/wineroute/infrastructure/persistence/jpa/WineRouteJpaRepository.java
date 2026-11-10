package com.vinnot.wineroute.infrastructure.persistence.jpa;

import com.vinnot.wineroute.infrastructure.persistence.entity.WineRouteJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for WineRouteJpaEntity.
 */
@Repository
public interface WineRouteJpaRepository extends JpaRepository<WineRouteJpaEntity, UUID> {

    @Query("SELECT r FROM WineRouteJpaEntity r LEFT JOIN FETCH r.stops WHERE r.id = :id")
    Optional<WineRouteJpaEntity> findByIdWithStops(@Param("id") UUID id);

    Page<WineRouteJpaEntity> findByStatus(WineRouteJpaEntity.StatusEnum status, Pageable pageable);

    @Query("SELECT r FROM WineRouteJpaEntity r WHERE r.status = :status "
            + "AND (:searchTerm IS NULL OR LOWER(r.name) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%'))) "
            + "AND (:country IS NULL OR r.country = :country) "
            + "AND (:region IS NULL OR r.region = :region) "
            + "AND (:difficulty IS NULL OR r.difficulty = :difficulty)")
    Page<WineRouteJpaEntity> search(
            @Param("searchTerm") String searchTerm,
            @Param("country") String country,
            @Param("region") String region,
            @Param("difficulty") WineRouteJpaEntity.DifficultyEnum difficulty,
            @Param("status") WineRouteJpaEntity.StatusEnum status,
            Pageable pageable
    );

    /**
     * Searches all routes without status filter (admin).
     */
    @Query("SELECT r FROM WineRouteJpaEntity r WHERE "
            + "(:searchTerm IS NULL OR LOWER(r.name) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')))"
            + " ORDER BY r.createdAt DESC")
    Page<WineRouteJpaEntity> searchAll(
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );

    List<WineRouteJpaEntity> findByCreatedBy(UUID createdBy);

    /**
     * Counts routes by status.
     *
     * @param status the status
     * @return count
     */
    long countByStatus(WineRouteJpaEntity.StatusEnum status);

    /**
     * Gets distinct countries.
     *
     * @return list of countries
     */
    @Query("SELECT DISTINCT r.country FROM WineRouteJpaEntity r WHERE r.status = 'PUBLISHED' AND r.country IS NOT NULL ORDER BY r.country")
    List<String> findDistinctCountries();

    /**
     * Gets distinct regions by country.
     *
     * @param country the country
     * @return list of regions
     */
    @Query("SELECT DISTINCT r.region FROM WineRouteJpaEntity r WHERE r.status = 'PUBLISHED' AND r.country = :country AND r.region IS NOT NULL ORDER BY r.region")
    List<String> findDistinctRegionsByCountry(@Param("country") String country);

    /**
     * Gets distinct subregions by country and region.
     *
     * @param country the country
     * @param region  the region
     * @return list of subregions
     */
    @Query("SELECT DISTINCT r.subregion FROM WineRouteJpaEntity r WHERE r.status = 'PUBLISHED' AND r.country = :country AND r.region = :region AND r.subregion IS NOT NULL ORDER BY r.subregion")
    List<String> findDistinctSubregionsByCountryAndRegion(@Param("country") String country, @Param("region") String region);
}
