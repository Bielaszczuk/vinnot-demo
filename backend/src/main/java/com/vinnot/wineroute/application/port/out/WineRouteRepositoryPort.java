package com.vinnot.wineroute.application.port.out;

import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;

/**
 * Output port for WineRoute aggregate persistence.
 */
public interface WineRouteRepositoryPort {

    record StopCounts(int stops, int wineries) {
    }

    Map<UUID, StopCounts> getStopCounts(List<UUID> routeIds);

    Optional<WineRoute> findById(UUID id);

    PageResult<WineRoute> findAll(PageQuery pageQuery);

    PageResult<WineRoute> findPublished(PageQuery pageQuery);

    /**
     * Searches published routes. Each null filter leaves the results unrestricted.
     *
     * @param searchTerm case-insensitive part of the route name
     * @param country    exact country
     * @param region     exact region
     * @param difficulty route length category
     * @param pageQuery  pagination info
     * @return page of matching published routes
     */
    PageResult<WineRoute> search(String searchTerm, String country, String region, RouteDifficulty difficulty,
            PageQuery pageQuery);

    PageResult<WineRoute> searchAll(String searchTerm, PageQuery pageQuery);

    List<WineRoute> findByCreator(UUID creatorId);

    WineRoute save(WineRoute route);

    void delete(WineRoute route);

    boolean existsById(UUID id);

    /**
     * Counts total routes.
     *
     * @return the total count
     */
    long count();

    /**
     * Counts published routes.
     *
     * @return the count of published routes
     */
    long countPublished();

    /**
     * Gets distinct countries.
     *
     * @return list of countries
     */
    List<String> findDistinctCountries();

    /**
     * Gets distinct regions by country.
     *
     * @param country the country
     * @return list of regions
     */
    List<String> findDistinctRegionsByCountry(String country);

    /**
     * Gets distinct subregions by country and region.
     *
     * @param country the country
     * @param region  the region
     * @return list of subregions
     */
    List<String> findDistinctSubregionsByCountryAndRegion(String country, String region);
}
