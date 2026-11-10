package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.PublishResult;
import com.vinnot.marketing.domain.model.SocialNetwork;

/** Publishes a post on one network (#510); there is one per network. */
public interface SocialPublisher {

    SocialNetwork network();

    /**
     * Publishes the carousel, or sends it as a draft when the network works that way.
     *
     * @throws SocialPublishingException when the network refused it or could not take it; its code tells whether a retry helps
     */
    PublishResult publish(PublishRequest request);
}
