package com.vinnot.community.domain.exception;

import com.vinnot.shared.domain.exception.DomainException;

/**
 * A manual palate change names no trait, an unknown trait, or a score that is not a whole number from 0 to 100
 * (#541 S11); 400.
 */
public class InvalidTasteAdjustmentException extends DomainException {
    public static final String CODE = "INVALID_TASTE_ADJUSTMENT";

    public InvalidTasteAdjustmentException(String message) {
        super(CODE, message);
    }
}
