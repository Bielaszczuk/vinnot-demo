package com.vinnot.wine.infrastructure.persistence.jpa;

import com.vinnot.wine.infrastructure.persistence.entity.GrapeTypeJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link GrapeTypeJpaEntity}.
 * Pure infrastructure concern — never referenced outside the persistence layer.
 */
@Repository
public interface GrapeTypeJpaRepository extends JpaRepository<GrapeTypeJpaEntity, UUID> {

    List<GrapeTypeJpaEntity> findByActiveTrueOrderByNameAsc();
}

