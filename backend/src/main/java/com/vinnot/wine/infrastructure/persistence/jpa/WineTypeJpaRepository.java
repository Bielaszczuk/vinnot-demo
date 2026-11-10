package com.vinnot.wine.infrastructure.persistence.jpa;

import com.vinnot.wine.infrastructure.persistence.entity.WineTypeJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WineTypeJpaRepository extends JpaRepository<WineTypeJpaEntity, UUID> {

    List<WineTypeJpaEntity> findByActiveTrueOrderBySortOrderAsc();
}

