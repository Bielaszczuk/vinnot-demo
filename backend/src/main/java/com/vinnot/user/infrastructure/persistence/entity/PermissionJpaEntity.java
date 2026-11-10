package com.vinnot.user.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
public class PermissionJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    private String description;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

