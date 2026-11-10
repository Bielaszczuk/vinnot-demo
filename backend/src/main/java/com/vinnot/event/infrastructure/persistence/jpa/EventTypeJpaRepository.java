package com.vinnot.event.infrastructure.persistence.jpa;

import com.vinnot.event.infrastructure.persistence.entity.EventTypeJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EventTypeJpaRepository extends JpaRepository<EventTypeJpaEntity, UUID> {

    List<EventTypeJpaEntity> findByActiveTrueOrderBySortOrderAsc();
}

