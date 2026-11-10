package com.vinnot.gamification.domain.model;

import java.util.Objects;
import java.util.UUID;

/**
 * What an award is about, so a movement can be labelled with the current wine or event name.
 *
 * @param kind the kind of subject
 * @param id   the wine or event
 */
public record PointSubject(Kind kind, UUID id) {
    public enum Kind {
        WINE,
        EVENT
    }

    public PointSubject {
        Objects.requireNonNull(kind, "kind");
    }

    public static PointSubject wine(UUID id) {
        return new PointSubject(Kind.WINE, id);
    }

    public static PointSubject event(UUID id) {
        return new PointSubject(Kind.EVENT, id);
    }
}
