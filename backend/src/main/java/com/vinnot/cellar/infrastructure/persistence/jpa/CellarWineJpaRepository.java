package com.vinnot.cellar.infrastructure.persistence.jpa;

import com.vinnot.cellar.infrastructure.persistence.entity.CellarWineJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CellarWineJpaRepository extends JpaRepository<CellarWineJpaEntity, UUID> {

    Optional<CellarWineJpaEntity> findByUserIdAndWineId(UUID userId, UUID wineId);

    Page<CellarWineJpaEntity> findByUserId(UUID userId, Pageable pageable);

    List<CellarWineJpaEntity> findAllByUserId(UUID userId);

    boolean existsByUserIdAndWineId(UUID userId, UUID wineId);
}

