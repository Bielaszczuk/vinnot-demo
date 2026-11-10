package com.vinnot.user.application.command.model;

import com.vinnot.user.domain.valueobject.SocialProvider;

public record SocialLoginCommand(
        SocialProvider provider,
        String token,
        String nonce,
        String firstName,
        String lastName,
        boolean reactivate
) {
}
