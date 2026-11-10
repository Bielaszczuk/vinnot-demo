package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.port.in.LoadUserPermissionsUseCase;
import com.vinnot.user.application.port.out.PermissionRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

/**
 * Loads the flat permission code set for a user, aggregated from all their roles.
 */
@Service
@RequiredArgsConstructor
public class LoadUserPermissionsHandler implements LoadUserPermissionsUseCase {

    private final PermissionRepositoryPort permissionRepository;

    @Override
    public Set<String> execute(UUID userId) {
        return permissionRepository.findPermissionCodesByUserId(userId);
    }
}

