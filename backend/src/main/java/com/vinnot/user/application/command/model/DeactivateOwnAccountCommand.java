package com.vinnot.user.application.command.model;

import java.util.UUID;

public record DeactivateOwnAccountCommand(UUID userId) {
}
