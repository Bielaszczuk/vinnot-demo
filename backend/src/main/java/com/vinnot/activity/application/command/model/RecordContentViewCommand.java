package com.vinnot.activity.application.command.model;

import com.vinnot.activity.domain.model.ContentKind;

import java.util.Objects;
import java.util.UUID;

/** The user opened the detail of a wine, route, event or winery. */
public record RecordContentViewCommand(UUID userId, ContentKind kind, UUID entityId) {
    public RecordContentViewCommand {
        Objects.requireNonNull(userId, "User cannot be null");
        Objects.requireNonNull(kind, "Kind cannot be null");
        Objects.requireNonNull(entityId, "Content cannot be null");
    }
}
