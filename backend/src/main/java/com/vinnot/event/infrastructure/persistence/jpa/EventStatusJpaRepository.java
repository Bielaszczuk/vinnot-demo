package com.vinnot.event.infrastructure.persistence.jpa;

import com.vinnot.event.infrastructure.persistence.entity.EventStatusJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EventStatusJpaRepository extends JpaRepository<EventStatusJpaEntity, UUID> {

    List<EventStatusJpaEntity> findByActiveTrueOrderBySortOrderAsc();
}

