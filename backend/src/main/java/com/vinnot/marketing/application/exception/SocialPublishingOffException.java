package com.vinnot.marketing.application.exception;

import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.shared.domain.exception.DomainException;

/**
 * A publication cannot be retried while publishing, or its network, is switched off (#510 S9): the retry would only fail
 * again. A post cannot be published now while publishing is off or no network is enabled (#513 S6). The shared web exception
 * handler answers it with 409.
 */
public class SocialPublishingOffException extends DomainException {
    public static final String CODE = "SOCIAL_PUBLISHING_OFF";

    public SocialPublishingOffException(SocialNetwork network) {
        super(CODE, "Social publishing on " + network + " is switched off");
    }

    /** Publishing is switched off, or no network is enabled. */
    public SocialPublishingOffException() {
        super(CODE, "Social publishing is switched off or no network is enabled");
    }
}
