package com.vinnot.marketing.domain.exception;

import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.shared.domain.exception.DomainException;

/**
 * The action is not allowed in the publication's current status (#510), for example retrying one that did not fail. The
 * shared web exception handler answers it with 409, like {@link InvalidPostTransitionException}.
 */
public class InvalidPublicationTransitionException extends DomainException {
    public static final String CODE = "INVALID_PUBLICATION_TRANSITION";

    public InvalidPublicationTransitionException(PublicationStatus status, String action) {
        super(CODE, "Cannot " + action + " a social publication in status " + status);
    }
}
