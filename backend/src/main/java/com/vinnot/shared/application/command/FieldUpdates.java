package com.vinnot.shared.application.command;

import com.vinnot.shared.domain.exception.DomainException;
import java.util.Set;
import java.util.Objects;

/** Partial update semantics: omitted/null preserves; clearFields explicitly removes a value. */
public final class FieldUpdates {
    private final Set<String> cleared;

    public FieldUpdates(Set<String> cleared, Set<String> nullableFields) {
        if (Objects.nonNull(cleared) && cleared.stream().anyMatch(Objects::isNull)) {
            throw new DomainException("INVALID_CLEAR_FIELDS", "Field names cannot be null");
        }
        this.cleared = Objects.isNull(cleared) ? Set.of() : Set.copyOf(cleared);
        if (!nullableFields.containsAll(this.cleared)) {
            throw new DomainException("INVALID_CLEAR_FIELDS", "Cannot clear a required or unknown field");
        }
    }

    public <T> T resolve(String field, T incoming, T current) {
        if (cleared.contains(field)) {
            if (Objects.nonNull(incoming)) {
                throw new DomainException("CONFLICTING_FIELD_UPDATE", "A field cannot be set and cleared together: " + field);
            }
            return null;
        }
        return Objects.isNull(incoming) ? current : incoming;
    }

    public boolean changes(String field, Object incoming) {
        return Objects.nonNull(incoming) || cleared.contains(field);
    }
}
