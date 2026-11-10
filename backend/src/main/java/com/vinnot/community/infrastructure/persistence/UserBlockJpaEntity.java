package com.vinnot.community.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Read-only query mapping; writes use the idempotent SQL adapter. */
@Entity
@Table(name = "user_blocks")
public class UserBlockJpaEntity {
    @Id private UUID id;

    @Column(name = "blocker_id")
    private UUID blockerId;

    @Column(name = "blocked_id")
    private UUID blockedId;
}
