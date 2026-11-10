package com.vinnot.marketing.domain.exception;

import com.vinnot.shared.domain.exception.DomainException;

import java.time.Instant;

/** A post may only be moved to a time still to come (#513 S5); the shared web exception handler answers it with 400. */
public class SocialPostScheduleNotFutureException extends DomainException {
    public static final String CODE = "SOCIAL_POST_SCHEDULE_NOT_FUTURE";

    public SocialPostScheduleNotFutureException(Instant scheduledFor) {
        super(CODE, "A social post cannot be moved to " + scheduledFor + ", which is not in the future");
    }
}
