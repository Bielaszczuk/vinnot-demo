package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.PushRequest;

/** Delivers one stored push request; called by the outbox worker. */
public interface DeliverPushUseCase {
    void deliver(PushRequest request);
}
