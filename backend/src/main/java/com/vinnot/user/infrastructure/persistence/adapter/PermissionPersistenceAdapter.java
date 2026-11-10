package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.PermissionRepositoryPort;
import com.vinnot.user.infrastructure.persistence.jpa.RoleJpaRepository;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

/**
 * Resolves permission codes for a user by loading their roles + permissions from DB.
 */
@Component
@RequiredArgsConstructor
public class PermissionPersistenceAdapter implements PermissionRepositoryPort {

    private final RoleJpaRepository roleJpaRepository;

    @Override
    public Set<String> findPermissionCodesByUserId(UUID userId) {
        return roleJpaRepository.findRolesWithPermissionsByUserId(userId)
                .stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getCode())
                .collect(Collectors.toSet());
    }
}

