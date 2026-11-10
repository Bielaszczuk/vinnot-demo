package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.model.DraftCheck;
import com.vinnot.marketing.domain.model.SocialNetwork;

/** Checks whether the creator posted a draft the agent sent to a network's inbox (#516); one per network that sends drafts. */
public interface SocialDraftTracker {

    SocialNetwork network();

    /**
     * Whether the draft with this network id was posted, and its public link when known.
     *
     * @throws SocialPublishingException when the network failed the draft or could not be asked; its code tells why
     */
    DraftCheck check(String externalId);
}
