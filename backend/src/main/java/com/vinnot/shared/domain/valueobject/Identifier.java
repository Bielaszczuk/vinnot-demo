package com.vinnot.shared.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;

import java.util.Objects;
import java.util.UUID;

public final class Identifier extends ValueObject {

    private final UUID value;

    private Identifier(UUID value) {
        this.value = Objects.requireNonNull(value, "Identifier value cannot be null");
    }

    /**
     * Creates a new random Identifier.
     *
     * @return a new Identifier with a random UUID
     */
    public static Identifier generate() {
        return new Identifier(UUID.randomUUID());
    }

    /**
     * Creates an Identifier from an existing UUID.
     *
     * @param value the UUID value
     * @return the Identifier wrapping the UUID
     */
    public static Identifier of(UUID value) {
        return new Identifier(value);
    }

    /**
     * Creates an Identifier from a string representation.
     *
     * @param value the string representation of the UUID
     * @return the Identifier wrapping the parsed UUID
     */
    public static Identifier fromString(String value) {
        return new Identifier(UUID.fromString(value));
    }

    /**
     * Gets the underlying UUID value.
     *
     * @return the UUID value
     */
    public UUID getValue() {
        return value;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{value};
    }

    @Override
    public String toString() {
        return value.toString();
    }
}

