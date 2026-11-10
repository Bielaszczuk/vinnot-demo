package com.vinnot.community.domain.model;

import java.util.Objects;
import java.util.UUID;

/** A public community surface, never a client-supplied author identity. */
public record ContentTarget(Type type, UUID id) {
    public enum Type {
        REVIEW,
        COMMENT,
        USER,
        EVENT,
        WINE_ROUTE
    }

    public ContentTarget {
        Objects.requireNonNull(type);
        Objects.requireNonNull(id);
    }
}
