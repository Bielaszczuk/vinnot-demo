package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.EmailSuppressionReason;

/** Addresses that must not receive email. Matching ignores case and surrounding spaces. */
public interface EmailSuppressionPort {
    boolean isSuppressed(String address);

    /** Idempotent: suppressing an address again keeps its first reason and records the latest event. */
    void suppress(String address, EmailSuppressionReason reason);
}
