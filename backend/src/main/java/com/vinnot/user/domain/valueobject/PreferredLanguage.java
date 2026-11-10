package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/** Language the user reads the product and its notifications in. */
public final class PreferredLanguage extends ValueObject {

    private static final Set<String> SUPPORTED = Set.of("es", "en");

    public static final PreferredLanguage DEFAULT = new PreferredLanguage("es");

    private final String value;

    private PreferredLanguage(String value) {
        this.value = value;
    }

    /**
     * Parses a supported language code.
     *
     * @param value a two-letter code, case-insensitive ("es" or "en")
     * @return the language
     */
    public static PreferredLanguage of(String value) {
        String normalized = Objects.isNull(value) ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED.contains(normalized)) {
            throw new DomainException(
                    "INVALID_PREFERRED_LANGUAGE", "Preferred language must be one of: es, en");
        }
        return new PreferredLanguage(normalized);
    }

    public String getValue() {
        return value;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{value};
    }

    @Override
    public String toString() {
        return value;
    }
}
