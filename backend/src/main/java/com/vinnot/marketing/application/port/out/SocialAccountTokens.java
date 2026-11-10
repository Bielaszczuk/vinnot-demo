package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.util.Optional;

/** The token to call each network with (#510): configured secrets for Meta, connected accounts for Threads and TikTok. */
public interface SocialAccountTokens {

    /** Empty when the network is not connected or not configured. */
    Optional<SocialAccessToken> tokenFor(SocialNetwork network);
}
