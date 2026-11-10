package com.vinnot.marketing.domain.exception;

import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.exception.DomainException;

/**
 * The action is not allowed in the post's current status (#489). It reuses the transition code the shared web
 * exception handler already answers with 409, so the queue conflicts like a wine submission reviewed twice.
 */
public class InvalidPostTransitionException extends DomainException {
    public static final String CODE = "INVALID_POST_TRANSITION";

    public InvalidPostTransitionException(SocialPostStatus status, String action) {
        super(CODE, "Cannot " + action + " a social post in status " + status);
    }
}
