package com.vinnot.user.application.command.model;

import java.util.UUID;

public record RequestEmailChangeCommand(UUID userId, String newEmail) {
}
