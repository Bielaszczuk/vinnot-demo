package com.vinnot.wineroute.infrastructure.persistence.jpa;

import com.vinnot.wineroute.infrastructure.persistence.entity.RouteStopJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for RouteStopJpaEntity.
 */
@Repository
public interface RouteStopJpaRepository extends JpaRepository<RouteStopJpaEntity, UUID> {

    interface StopCountRow {
        UUID getRouteId();
        int getStops();
        int getWineries();
    }

    @Query(value = """
            SELECT wine_route_id AS "routeId", COUNT(*) AS stops,
                   COUNT(*) FILTER (WHERE lower(type) = 'winery') AS wineries
            FROM wine_route_stops WHERE wine_route_id IN (:ids) GROUP BY wine_route_id
            """, nativeQuery = true)
    List<StopCountRow> countForRoutes(@Param("ids") List<UUID> ids);

    List<RouteStopJpaEntity> findByWineRouteIdOrderByStopOrderAsc(UUID wineRouteId);

    @Modifying
    @Query("DELETE FROM RouteStopJpaEntity r WHERE r.wineRouteId = :routeId")
    void deleteByWineRouteId(@Param("routeId") UUID routeId);
}
