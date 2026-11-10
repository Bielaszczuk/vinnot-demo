package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;

public final class Password extends ValueObject {

    private static final int MIN_LENGTH = 8;

    private final String hashedValue;

    private Password(String hashedValue) {
        this.hashedValue = Objects.requireNonNull(hashedValue, "Password hash cannot be null");
    }

    /**
     * Creates a Password from an already hashed value.
     *
     * @param hashedValue the hashed password
     * @return the Password value object
     */
    public static Password fromHash(String hashedValue) {
        return new Password(hashedValue);
    }

    /**
     * Validates a plain text password meets requirements.
     *
     * @param plainPassword the plain text password to validate
     * @throws DomainException if password doesn't meet requirements
     */
    public static void validatePlainPassword(String plainPassword) {
        Objects.requireNonNull(plainPassword, "Password cannot be null");
        if (plainPassword.length() < MIN_LENGTH) {
            throw new DomainException("WEAK_PASSWORD",
                    String.format("Password must be at least %d characters", MIN_LENGTH));
        }
        if (!plainPassword.matches(".*[A-Z].*")) {
            throw new DomainException("WEAK_PASSWORD", "Password must contain at least one uppercase letter");
        }
        if (!plainPassword.matches(".*[a-z].*")) {
            throw new DomainException("WEAK_PASSWORD", "Password must contain at least one lowercase letter");
        }
        if (!plainPassword.matches(".*[0-9].*")) {
            throw new DomainException("WEAK_PASSWORD", "Password must contain at least one digit");
        }
    }

    /**
     * Gets the hashed password value.
     *
     * @return the hashed password
     */
    public String getHashedValue() {
        return hashedValue;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{hashedValue};
    }

    @Override
    public String toString() {
        return "[PROTECTED]";
    }
}

