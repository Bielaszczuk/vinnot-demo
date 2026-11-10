package com.vinnot.marketing.application.exception;

import com.vinnot.shared.domain.exception.DomainException;

import java.time.LocalDate;

/**
 * Another post already goes out on that local date (#513 S5: one post per date). The shared web exception handler answers it
 * with 409.
 */
public class SocialPostDateTakenException extends DomainException {
    public static final String CODE = "SOCIAL_POST_DATE_TAKEN";

    public SocialPostDateTakenException(LocalDate date) {
        super(CODE, "Another social post is already scheduled on " + date);
    }
}
