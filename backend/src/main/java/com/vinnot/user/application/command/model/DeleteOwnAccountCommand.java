package com.vinnot.user.application.command.model;

import java.util.UUID;

public record DeleteOwnAccountCommand(
        UUID userId,
        String appleAuthorizationCode,
        String appleClientId,
        String appleRedirectUri
) {
}
