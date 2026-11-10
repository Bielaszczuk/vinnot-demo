package com.vinnot.marketing.application.model;

import java.time.Instant;
import java.util.Objects;

/**
 * The token to call one network with (#510) and the account it acts on: the Instagram user id, the Facebook Page id, the
 * Threads user id or the TikTok open_id. {@code expiresAt} is null for a token that does not expire. Its text form hides
 * the token.
 */
public record SocialAccessToken(String accessToken, String accountId, Instant expiresAt) {
    public SocialAccessToken {
        Objects.requireNonNull(accessToken, "accessToken");
        Objects.requireNonNull(accountId, "accountId");
    }

    @Override
    public String toString() {
        return "SocialAccessToken[accessToken=***, accountId=" + accountId + ", expiresAt=" + expiresAt + "]";
    }
}
