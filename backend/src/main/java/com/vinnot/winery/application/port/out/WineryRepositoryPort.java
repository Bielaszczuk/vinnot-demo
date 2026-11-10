package com.vinnot.winery.application.port.out;

import java.util.Map;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port (driven) for Winery aggregate persistence.
 * Defines the contract for winery persistence operations.
 */
public interface WineryRepositoryPort {

    Optional<Winery> findById(UUID id);

    List<Winery> findAllByIds(List<UUID> ids);

    /** Active wineries whose names exactly match, ignoring case; not catalogue search. */
    List<Winery> findActiveByExactNames(List<String> names);

    Optional<Winery> findBySlug(String slug);

    PageResult<Winery> findAll(PageQuery pageQuery, boolean includeInactive);

    PageResult<Winery> search(String searchTerm, String country, String region, PageQuery pageQuery);

    List<Winery> findByCountry(String country);

    List<Winery> findByRegion(String region);

    Winery save(Winery winery);

    void delete(Winery winery);

    boolean existsById(UUID id);

    boolean existsBySlug(String slug);

    /** Active catalog wines grouped by winery; absent IDs have zero wines. */
    Map<UUID, Integer> countActiveWinesByWineryIds(List<UUID> ids);

    long count();
}
