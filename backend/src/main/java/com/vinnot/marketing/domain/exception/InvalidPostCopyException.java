package com.vinnot.marketing.domain.exception;

import com.vinnot.shared.domain.exception.DomainException;

/** The copy breaks a limit of {@link com.vinnot.marketing.domain.model.PostCopy}; answered as 400. */
public class InvalidPostCopyException extends DomainException {
    public static final String CODE = "INVALID_POST_COPY";

    public InvalidPostCopyException(String message) {
        super(CODE, message);
    }
}
