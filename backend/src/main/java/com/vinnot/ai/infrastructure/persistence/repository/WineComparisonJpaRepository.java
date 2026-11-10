package com.vinnot.ai.infrastructure.persistence.repository;

import com.vinnot.ai.infrastructure.persistence.entity.WineComparisonJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WineComparisonJpaRepository extends JpaRepository<WineComparisonJpaEntity, UUID> {

    @Query("SELECT c FROM WineComparisonJpaEntity c WHERE c.wineAId = :wineAId "
            + "AND c.wineBId = :wineBId AND c.language = :language")
    Optional<WineComparisonJpaEntity> findByWineIdsAndLanguage(
            @Param("wineAId") UUID wineAId,
            @Param("wineBId") UUID wineBId,
            @Param("language") String language
    );

    @Query("SELECT COUNT(c) > 0 FROM WineComparisonJpaEntity c WHERE c.wineAId = :wineAId "
            + "AND c.wineBId = :wineBId AND c.language = :language")
    boolean existsByWineIdsAndLanguage(
            @Param("wineAId") UUID wineAId,
            @Param("wineBId") UUID wineBId,
            @Param("language") String language
    );

    @Modifying
    @Query("DELETE FROM WineComparisonJpaEntity c WHERE c.wineAId = :wineAId "
            + "AND c.wineBId = :wineBId AND c.language = :language")
    void deleteByWineIdsAndLanguage(
            @Param("wineAId") UUID wineAId,
            @Param("wineBId") UUID wineBId,
            @Param("language") String language
    );
}

