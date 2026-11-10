package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;

/** Tells the admins what publishing needs from them (#510). */
public interface SocialPublishingNotices {

    /** A post failed for good on this network, with the error code. */
    void postFailed(SocialPost post, SocialNetwork network, String errorCode);

    /** A TikTok draft of the post waits in the creator's inbox to be published by hand. */
    void tiktokDraftWaiting(SocialPost post);

    /** A connected account stopped working (its token could not be refreshed) and must be connected again. */
    void accountNeedsReconnect(SocialNetwork network);
}
