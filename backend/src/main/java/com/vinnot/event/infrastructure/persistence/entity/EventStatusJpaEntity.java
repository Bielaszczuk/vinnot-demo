package com.vinnot.event.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * JPA entity for the event_statuses reference table (created in V35).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "event_statuses")
public class EventStatusJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name_es", nullable = false, length = 100)
    private String nameEs;

    @Column(name = "name_en", nullable = false, length = 100)
    private String nameEn;

    @Column(name = "is_terminal", nullable = false)
    private boolean terminal = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}

