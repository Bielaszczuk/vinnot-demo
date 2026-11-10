package com.vinnot.ai.infrastructure.persistence.repository;

import com.vinnot.ai.infrastructure.persistence.entity.WineAiProfileJpaEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WineAiProfileJpaRepository extends JpaRepository<WineAiProfileJpaEntity, UUID> {

    Optional<WineAiProfileJpaEntity> findByWineIdAndLanguage(UUID wineId, String language);

    boolean existsByWineIdAndLanguage(UUID wineId, String language);

    // Keyset pages served by the unique (wine_id, language) index.
    @Query("SELECT DISTINCT p.wineId FROM WineAiProfileJpaEntity p ORDER BY p.wineId")
    List<UUID> findProfiledWineIds(Pageable page);

    @Query("SELECT DISTINCT p.wineId FROM WineAiProfileJpaEntity p WHERE p.wineId > :after ORDER BY p.wineId")
    List<UUID> findProfiledWineIdsAfter(@Param("after") UUID after, Pageable page);

    @Modifying
    @Query("DELETE FROM WineAiProfileJpaEntity p WHERE p.wineId = :wineId AND p.language = :language")
    void deleteByWineIdAndLanguage(@Param("wineId") UUID wineId, @Param("language") String language);
}

