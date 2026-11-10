package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;
import java.util.regex.Pattern;

public final class Email extends ValueObject {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"
    );

    private final String value;

    private Email(String value) {
        Objects.requireNonNull(value, "Email cannot be null");
        String normalizedValue = value.toLowerCase().trim();
        validate(normalizedValue);
        this.value = normalizedValue;
    }

    /**
     * Creates an Email from a string.
     *
     * @param value the email string
     * @return the Email value object
     */
    public static Email of(String value) {
        return new Email(value);
    }

    private void validate(String email) {
        if (email.isBlank()) {
            throw new DomainException("INVALID_EMAIL", "Email cannot be empty");
        }
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new DomainException("INVALID_EMAIL", "Invalid email format");
        }
    }

    /**
     * Gets the email string value.
     *
     * @return the email string
     */
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
