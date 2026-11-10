package com.vinnot.marketing.application.port.in;

import java.time.Instant;
import java.util.UUID;

/** Publishes one queued publication on its network (#510 S2), as the durable effect the sweep or a retry queued. */
public interface PublishSocialPostUseCase {

    /**
     * Claims the publication and publishes it; a duplicate run finds it claimed and does nothing. Throws the network's
     * {@code SocialPublishingException} when it failed transiently and another attempt is due, so the caller retries later.
     */
    void publish(UUID publicationId, Instant now);
}
