package com.vinnot.marketing.application.model;

import java.time.Instant;
import java.util.Objects;

/**
 * What a network answered to a code exchange or a refresh (#510 S5): the account, its tokens and when they expire,
 * always computed from the network's {@code expires_in} values. {@code displayName}, {@code refreshToken} and
 * {@code refreshExpiresAt} may be null. Its text form hides the tokens.
 */
public record SocialAccountGrant(String accountId, String displayName, String accessToken, Instant accessExpiresAt,
        String refreshToken, Instant refreshExpiresAt) {
    public SocialAccountGrant {
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(accessToken, "accessToken");
    }

    @Override
    public String toString() {
        return "SocialAccountGrant[accountId=" + accountId + ", displayName=" + displayName + ", accessExpiresAt=" + accessExpiresAt
                + ", refreshExpiresAt=" + refreshExpiresAt + ", tokens=***]";
    }
}
