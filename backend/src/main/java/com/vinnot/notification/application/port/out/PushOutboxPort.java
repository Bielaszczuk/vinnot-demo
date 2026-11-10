package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.PushRequest;

import java.time.Duration;
import java.util.List;

/** Durable storage that joins the caller's transaction and ignores a repeated dedupe key. */
public interface PushOutboxPort {
    void store(PushRequest request, Duration delay);

    /** Stores many delayed requests in one batch write. */
    void storeAll(List<Delayed> requests);

    record Delayed(PushRequest request, Duration delay) {
    }
}
