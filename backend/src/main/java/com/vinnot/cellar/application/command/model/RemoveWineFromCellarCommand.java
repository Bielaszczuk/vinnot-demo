package com.vinnot.cellar.application.command.model;

import java.util.UUID;

public record RemoveWineFromCellarCommand(UUID cellarWineId, UUID requestingUserId) {
}
