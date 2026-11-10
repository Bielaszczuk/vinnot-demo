package com.vinnot.marketing.domain.exception;

import com.vinnot.shared.domain.exception.DomainException;

/** The request names no language of {@link com.vinnot.marketing.domain.model.PostLanguage} (#497); answered as 400. */
public class InvalidPostLanguageException extends DomainException {
    public static final String CODE = "INVALID_POST_LANGUAGE";

    public InvalidPostLanguageException(String message) {
        super(CODE, message);
    }
}
