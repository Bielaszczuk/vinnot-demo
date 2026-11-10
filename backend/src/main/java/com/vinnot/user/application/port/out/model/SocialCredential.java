package com.vinnot.user.application.port.out.model;

import com.vinnot.user.domain.valueobject.SocialProvider;

public record SocialCredential(
        SocialProvider provider,
        String token,
        String nonce,
        String firstName,
        String lastName
) {
}
