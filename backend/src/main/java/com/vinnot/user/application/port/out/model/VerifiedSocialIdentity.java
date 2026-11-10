package com.vinnot.user.application.port.out.model;

import com.vinnot.user.domain.valueobject.SocialProvider;

public record VerifiedSocialIdentity(
        SocialProvider provider,
        String subject,
        String email,
        boolean emailVerified,
        String firstName,
        String lastName,
        String profileImageUrl
) {
}
