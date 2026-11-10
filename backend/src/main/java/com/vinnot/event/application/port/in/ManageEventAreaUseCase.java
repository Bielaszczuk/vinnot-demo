package com.vinnot.event.application.port.in;

import com.vinnot.event.domain.valueobject.EventArea;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import java.util.Optional;
import java.util.UUID;

/** The area a user hears about new events in; having one is how they opt in. */
public interface ManageEventAreaUseCase {
    Optional<AreaView> find(UUID userId);

    /** Replaces the user's area. Throws {@link EntityNotFoundException} for an unknown region. */
    void set(UUID userId, EventArea area);

    void clear(UUID userId);

    /** What the user sees: a named region, or that an approximate location is in use (never the location itself). */
    record AreaView(Kind kind, UUID regionId, String regionName) {
        public enum Kind { REGION, APPROXIMATE }
    }
}
