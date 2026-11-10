package com.vinnot.cellar.application.port.out;

import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CellarWineRepositoryPort {

    Optional<CellarWine> findById(UUID id);

    Optional<CellarWine> findByUserIdAndWineId(UUID userId, UUID wineId);

    PageResult<CellarWine> findByUserId(UUID userId, PageQuery pageQuery);

    List<CellarWine> findAllByUserId(UUID userId);

    CellarWine save(CellarWine cellarWine);

    void delete(CellarWine cellarWine);

    boolean existsByUserIdAndWineId(UUID userId, UUID wineId);

    /**
     * Counts cellar entries for a user.
     *
     * @param userId the user ID
     * @return the count
     */
    long countByUserId(UUID userId);
}
