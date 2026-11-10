package com.vinnot.user.infrastructure.persistence.jpa;

import com.vinnot.user.infrastructure.persistence.entity.RoleJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Set;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;

public interface RoleJpaRepository extends JpaRepository<RoleJpaEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RoleJpaEntity r WHERE r.name = 'ROLE_ADMIN'")
    Optional<RoleJpaEntity> lockAdministratorRole();

    /**
     * Loads all roles (with their permissions) for a given user.
     * Used at login time to build the JWT permissions claim.
     */
    @Query("""
            SELECT r FROM RoleJpaEntity r
            JOIN FETCH r.permissions
            WHERE r.id IN (
                SELECT ur.id.roleId FROM UserRoleJpaEntity ur WHERE ur.id.userId = :userId
            )
            """)
    Set<RoleJpaEntity> findRolesWithPermissionsByUserId(@Param("userId") UUID userId);
}

