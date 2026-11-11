package com.vinnot.community.domain.exception;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

/** The owner's cellar setting hides the cellar from this viewer (#541); answered with 403. */
public class CellarNotVisibleException extends BusinessRuleViolationException {
    public static final String CODE = "CELLAR_NOT_VISIBLE";

    public CellarNotVisibleException() {
        super(CODE, "This member's cellar is not visible to you");
    }
}
