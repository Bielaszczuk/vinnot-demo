package com.vinnot.notification.domain.model;

/** Why an address no longer receives email. Soft bounces never suppress: they are retried by the provider. */
public enum EmailSuppressionReason {
    HARD_BOUNCE,
    COMPLAINT
}
