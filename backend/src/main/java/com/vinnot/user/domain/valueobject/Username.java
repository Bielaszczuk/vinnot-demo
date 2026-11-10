package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

public final class Username extends ValueObject {

    public static final int MIN_LENGTH = 3;
    public static final int MAX_LENGTH = 40;

    private static final Pattern USERNAME_PATTERN = Pattern.compile(
            "^[a-z0-9](?:[a-z0-9._-]{1,38}[a-z0-9])$"
    );

    private final String value;

    private Username(String value) {
        String normalized = normalize(value);
        validate(normalized);
        this.value = normalized;
    }

    public static Username of(String value) {
        return new Username(value);
    }

    public static String normalize(String value) {
        if (Objects.isNull(value)) {
            throw new DomainException("INVALID_USERNAME", "Username is required");
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private void validate(String username) {
        if (username.length() < MIN_LENGTH || username.length() > MAX_LENGTH) {
            throw new DomainException(
                    "INVALID_USERNAME",
                    "Username must be between 3 and 40 characters");
        }
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new DomainException(
                    "INVALID_USERNAME",
                    "Username may contain lowercase letters, numbers, dots, hyphens, and underscores, "
                            + "and must start and end with a letter or number");
        }
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
