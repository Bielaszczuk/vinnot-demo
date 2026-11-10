package com.vinnot.marketing.domain.exception;

import com.vinnot.shared.domain.exception.DomainException;

/**
 * The admin tried to switch off the last active rotating pillar (#510): the weekly planner would have nothing to plan. The
 * shared web exception handler answers it with 409.
 */
public class LastRotatingPillarException extends DomainException {
    public static final String CODE = "LAST_ROTATING_PILLAR";

    public LastRotatingPillarException(String pillarCode) {
        super(CODE, "Pillar " + pillarCode + " is the last active rotating pillar and cannot be switched off");
    }
}
