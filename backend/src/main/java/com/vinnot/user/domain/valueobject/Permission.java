package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;

import java.util.Objects;

/**
 * Value object representing a single permission code (e.g. WINE_CREATE, EVENT_UPDATE_OWN).
 * Permission codes are stored in DB and loaded at login time.
 */
public final class Permission extends ValueObject {

    private final String code;

    private Permission(String code) {
        this.code = Objects.requireNonNull(code, "Permission code cannot be null");
    }

    public static Permission of(String code) {
        if (Objects.isNull(code) || code.isBlank()) {
            throw new IllegalArgumentException("Permission code cannot be blank");
        }
        return new Permission(code.toUpperCase());
    }

    public String getCode() {
        return code;
    }

    /** Returns the Spring Security authority string (same as code). */
    public String toAuthority() {
        return code;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{code};
    }

    @Override
    public String toString() {
        return code;
    }
}

