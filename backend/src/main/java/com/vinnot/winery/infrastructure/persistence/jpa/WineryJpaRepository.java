package com.vinnot.winery.infrastructure.persistence.jpa;

import com.vinnot.winery.infrastructure.persistence.entity.WineryJpaEntity;
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
 * Spring Data JPA repository for WineryJpaEntity.
 */
@Repository
public interface WineryJpaRepository extends JpaRepository<WineryJpaEntity, UUID> {

    interface WineCount {
        UUID getWineryId();
        long getWinesCount();
    }

    @Query(value = "SELECT winery_id AS wineryId, COUNT(*) AS winesCount FROM wines "
            + "WHERE is_active = true AND winery_id IN (:ids) GROUP BY winery_id", nativeQuery = true)
    List<WineCount> countActiveWinesByWineryIds(@Param("ids") List<UUID> ids);

    Optional<WineryJpaEntity> findBySlug(String slug);

    @Query("SELECT w FROM WineryJpaEntity w LEFT JOIN FETCH w.countryEntity "
            + "LEFT JOIN FETCH w.regionEntity region LEFT JOIN FETCH region.country "
            + "WHERE w.active = true AND LOWER(w.name) IN :names ORDER BY w.name ASC, w.id ASC")
    List<WineryJpaEntity> findActiveByExactNames(@Param("names") List<String> normalizedNames);

    Page<WineryJpaEntity> findByActiveTrueOrderByNameAsc(Pageable pageable);

    /**
     * Catalogue search. {@code country} matches the country name or its ISO code, ignoring case, because
     * clients send the name ({@code ?country=Argentina}); the region matches its name, ignoring case.
     */
    @Query("SELECT w FROM WineryJpaEntity w LEFT JOIN w.countryEntity country LEFT JOIN w.regionEntity region WHERE w.active = true "
            + "AND (:searchTerm IS NULL OR LOWER(w.name) LIKE "
            + "LOWER(CONCAT('%', :searchTerm, '%')) "
            + "OR LOWER(COALESCE(w.businessName, '')) LIKE LOWER(CONCAT('%', :searchTerm, '%')) "
            + "OR LOWER(COALESCE(w.seoName, '')) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) "
            + "AND (:country IS NULL OR LOWER(country.name) = LOWER(CAST(:country AS String)) "
            + "OR LOWER(country.code) = LOWER(CAST(:country AS String))) "
            + "AND (:regionName IS NULL OR LOWER(region.name) = LOWER(CAST(:regionName AS String))) "
            + "ORDER BY w.name ASC")
    Page<WineryJpaEntity> search(
            @Param("searchTerm") String searchTerm,
            @Param("country") String country,
            @Param("regionName") String regionName,
            Pageable pageable
    );

    @Query("SELECT w FROM WineryJpaEntity w LEFT JOIN w.countryEntity country LEFT JOIN w.regionEntity region WHERE w.active = true "
            + "AND (:country IS NULL OR LOWER(country.name) = LOWER(CAST(:country AS String)) "
            + "OR LOWER(country.code) = LOWER(CAST(:country AS String))) "
            + "AND (:regionName IS NULL OR LOWER(region.name) = LOWER(CAST(:regionName AS String))) "
            + "ORDER BY w.name ASC")
    Page<WineryJpaEntity> searchWithoutTerm(
            @Param("country") String country,
            @Param("regionName") String regionName,
            Pageable pageable
    );

    List<WineryJpaEntity> findByCountryEntityCodeAndActiveTrue(String code);

    List<WineryJpaEntity> findByRegionEntityNameAndActiveTrue(String name);

    boolean existsBySlug(String slug);
}
