package com.vinnot.marketing.application.port.out;

import java.time.Duration;
import java.util.UUID;

/** Queues the durable publication of one post on one network (#510). */
public interface SocialPublishQueue {

    /** Queues the publication to run after {@code delay} (#513 S4: a network's not-before time). */
    void enqueue(UUID publicationId, Duration delay);

    /** Queues the publication to run at once. */
    default void enqueue(UUID publicationId) {
        enqueue(publicationId, Duration.ZERO);
    }
}
