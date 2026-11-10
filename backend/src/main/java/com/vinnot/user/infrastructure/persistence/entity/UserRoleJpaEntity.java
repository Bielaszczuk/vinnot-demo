package com.vinnot.user.infrastructure.persistence.entity;

import com.vinnot.user.infrastructure.persistence.jpa.RoleJpaRepository;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * JPA entity for the user_roles junction table.
 * Used by {@link RoleJpaRepository}
 * to load permissions per user.
 */
@Entity
@Table(name = "user_roles")
@Getter
@Setter
@NoArgsConstructor
public class UserRoleJpaEntity {

    @EmbeddedId
    private UserRoleId id = new UserRoleId();

    public UUID getUserId() { return id.userId; }
    public UUID getRoleId() { return id.roleId; }

    @Embeddable
    @Getter
    @Setter
    @EqualsAndHashCode
    @NoArgsConstructor
    public static class UserRoleId implements Serializable {
        @Column(name = "user_id")
        private UUID userId;

        @Column(name = "role_id")
        private UUID roleId;
    }
}
