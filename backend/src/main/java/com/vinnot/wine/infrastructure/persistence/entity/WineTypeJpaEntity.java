package com.vinnot.wine.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * JPA entity for the wine_types reference table.
 * Do not confuse with the {@code WineType} domain enum — this entity supports
 * DB-backed catalog management (i18n labels, sort order, active flag).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "wine_types")
public class WineTypeJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name_es", nullable = false, length = 100)
    private String nameEs;

    @Column(name = "name_en", nullable = false, length = 100)
    private String nameEn;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}

