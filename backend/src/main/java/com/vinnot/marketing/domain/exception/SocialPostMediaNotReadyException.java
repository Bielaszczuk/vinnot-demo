package com.vinnot.marketing.domain.exception;

import com.vinnot.shared.domain.exception.DomainException;

/**
 * An approved post is published now only with its Spanish media ready in both formats (#513 S6). The shared web exception
 * handler answers it with 409.
 */
public class SocialPostMediaNotReadyException extends DomainException {
    public static final String CODE = "SOCIAL_POST_MEDIA_NOT_READY";

    public SocialPostMediaNotReadyException() {
        super(CODE, "The social post's media is not ready to publish");
    }
}
