package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;

/**
 * Who may see a member's cellar on their public profile (#541). The setting lives with the member; the community
 * module applies it when another member opens the profile or the cellar listing. Notes and purchase prices are never
 * public, whatever the setting.
 */
public enum CellarVisibility {
    /** Every signed-in member; the default. */
    PUBLIC,
    /** Only the members who follow the owner. */
    FOLLOWERS,
    /** Only the owner. */
    PRIVATE;

    public static final CellarVisibility DEFAULT = PUBLIC;

    /**
     * Parses a requested setting.
     *
     * @param value PUBLIC, FOLLOWERS or PRIVATE, case-insensitive
     * @return the setting
     */
    public static CellarVisibility of(String value) {
        String normalized = Objects.isNull(value) ? "" : value.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values()).filter(visibility -> visibility.name().equals(normalized)).findFirst()
                .orElseThrow(() -> new DomainException("INVALID_CELLAR_VISIBILITY",
                        "Cellar visibility must be one of: PUBLIC, FOLLOWERS, PRIVATE"));
    }
}
