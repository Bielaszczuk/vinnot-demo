package com.vinnot.wine.infrastructure.persistence.jpa;

import com.vinnot.wine.infrastructure.persistence.entity.WineJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;

/**
 * Spring Data JPA repository for {@link WineJpaEntity}.
 * Pure infrastructure concern — never referenced outside the persistence layer.
 */
@Repository
public interface WineJpaRepository extends JpaRepository<WineJpaEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM WineJpaEntity w WHERE w.id = :id")
    Optional<WineJpaEntity> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Finds all active wines.
     *
     * @param pageable pagination info
     * @return page of active wines
     */
    Page<WineJpaEntity> findByActiveTrueOrderByNameAsc(Pageable pageable);

    /**
     * Finds featured active wines.
     *
     * @param pageable pagination info
     * @return page of featured wines
     */
    Page<WineJpaEntity> findByFeaturedTrueAndActiveTrue(Pageable pageable);

    /**
     * Finds top rated active wines.
     *
     * @param pageable pagination info
     * @return page of top rated wines
     */
    @Query("SELECT w FROM WineJpaEntity w WHERE w.active = true ORDER BY w.ratingAverage DESC")
    Page<WineJpaEntity> findTopRated(Pageable pageable);

    @Query("SELECT w FROM WineJpaEntity w LEFT JOIN FETCH w.countryEntity "
            + "LEFT JOIN FETCH w.regionEntity WHERE w.active = true AND w.ratingCount > 0 "
            + "AND w.ratingAverage > 0 ORDER BY w.ratingAverage DESC, w.ratingCount DESC, w.id ASC")
    List<WineJpaEntity> findHighlights(Pageable pageable);

    /**
     * Finds recent active wines.
     *
     * @param pageable pagination info
     * @return page of recent wines
     */
    @Query("SELECT w FROM WineJpaEntity w WHERE w.active = true ORDER BY w.createdAt DESC")
    Page<WineJpaEntity> findRecent(Pageable pageable);

    /**
     * Finds wines by winery ID.
     *
     * @param wineryId the winery ID
     * @return list of wines
     */
    List<WineJpaEntity> findByWineryIdAndActiveTrue(UUID wineryId);

    /**
     * Finds similar wines by type, excluding the given wine.
     *
     * @param wineType  the wine type
     * @param excludeId the ID to exclude
     * @param limit     max results
     * @return list of similar wines
     */
    @Query("SELECT w FROM WineJpaEntity w WHERE w.active = true AND w.wineType = :wineType "
            + "AND w.id <> :excludeId ORDER BY w.ratingAverage DESC")
    List<WineJpaEntity> findSimilar(
            @Param("wineType") WineJpaEntity.WineTypeEnum wineType,
            @Param("excludeId") UUID excludeId,
            @Param("limit") int limit
    );

    /**
     * Finds popular wines by review count.
     *
     * @param pageable pagination info
     * @return page of popular wines
     */
    @Query("SELECT w FROM WineJpaEntity w WHERE w.active = true ORDER BY w.ratingCount DESC, w.ratingAverage DESC")
    Page<WineJpaEntity> findPopular(Pageable pageable);

    /**
     * Finds recommended wines (featured and high rated).
     *
     * @param pageable pagination info
     * @return page of recommended wines
     */
    @Query("SELECT w FROM WineJpaEntity w WHERE w.active = true "
            + "ORDER BY w.featured DESC, w.ratingAverage DESC, w.ratingCount DESC")
    Page<WineJpaEntity> findRecommended(Pageable pageable);

}
