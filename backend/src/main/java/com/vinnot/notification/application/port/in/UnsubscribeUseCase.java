package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.NotificationCategory;

/** One-click unsubscribe from the email channel of a category, authorized only by the signed token. */
public interface UnsubscribeUseCase {

    /** Idempotent; throws {@code INVALID_UNSUBSCRIBE_LINK} when the token is not valid. */
    NotificationCategory unsubscribe(String token);
}
