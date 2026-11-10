package com.vinnot.user.application.service;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.command.response.AuthenticatedUserResponse;
import com.vinnot.user.application.port.in.LoadUserPermissionsUseCase;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthSessionResponseFactory {

    private final SocialIdentityRepositoryPort socialIdentityRepository;
    private final TokenService tokenService;
    private final LoadUserPermissionsUseCase loadPermissions;

    public AuthSessionResponse create(User user, String refreshToken) {
        List<String> roles = user.getRoles().stream()
                .map(role -> "ROLE_" + role.name())
                .toList();
        List<String> permissions = loadPermissions.execute(user.getId()).stream().sorted().toList();

        return new AuthSessionResponse(
                tokenService.generateAccessToken(
                        user.getId(), user.getEmail().getValue(), roles, permissions, user.getSessionVersion()),
                refreshToken,
                "Bearer",
                tokenService.getAccessTokenExpiration(),
                formatUser(user, roles, permissions));
    }

    private AuthenticatedUserResponse formatUser(
            User user, List<String> roles, List<String> permissions) {
        List<String> socialProviders = socialIdentityRepository.findByUserId(user.getId()).stream()
                .map(SocialIdentity::provider)
                .map(Enum::name)
                .distinct()
                .sorted()
                .toList();
        return new AuthenticatedUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail().getValue(),
                user.getFullName(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.getProfileImageUrl(),
                roles,
                permissions,
                user.isActive(),
                user.isLocked(),
                user.isEmailVerified(),
                !socialProviders.isEmpty(),
                user.hasPassword(),
                user.isOnboardingCompleted(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                socialProviders);
    }
}
