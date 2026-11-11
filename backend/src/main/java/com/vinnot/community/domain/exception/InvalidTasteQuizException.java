package com.vinnot.community.domain.exception;

import com.vinnot.shared.domain.exception.DomainException;

/** The taste quiz answers miss a question, name an unknown one or pick an option of another question (#541); 400. */
public class InvalidTasteQuizException extends DomainException {
    public static final String CODE = "INVALID_TASTE_QUIZ";

    public InvalidTasteQuizException(String message) {
        super(CODE, message);
    }
}
