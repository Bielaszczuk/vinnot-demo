package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.util.Optional;

/** Reads a published post's metrics from one network (#510); there is one per network. */
public interface SocialMetricsReader {

    SocialNetwork network();

    /**
     * The post's current metrics; empty when the network has none for it (yet).
     *
     * @throws SocialPublishingException on authentication or transport errors
     */
    Optional<PublicationMetrics> read(String externalId);
}
