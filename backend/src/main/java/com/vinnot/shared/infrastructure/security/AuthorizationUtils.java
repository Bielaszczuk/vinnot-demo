package com.vinnot.shared.infrastructure.security;

import com.vinnot.shared.domain.valueobject.ResourceReader;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Objects;
import java.util.UUID;

public final class AuthorizationUtils {

    private AuthorizationUtils() {
    }

    public static boolean hasAuthority(Authentication authentication, String authority) {
        return Objects.nonNull(authentication)
                && authentication.getAuthorities().stream()
                .anyMatch(granted -> authority.equals(granted.getAuthority()));
    }

    public static ResourceReader resourceReader(Authentication authentication) {
        if (Objects.isNull(authentication) || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return ResourceReader.anonymous();
        }
        return new ResourceReader(UUID.fromString(authentication.getName()),
                hasAuthority(authentication, "ROLE_ADMIN") || hasAuthority(authentication, "ROLE_MODERATOR"));
    }
}
