package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Instant;
import java.util.Objects;

/**
 * A connected account leased to one refresher until {@code claimedUntil} (#510 S5), with its decrypted tokens. The lease
 * end identifies the claim: marks made after the lease was lost (expired, or the account was reconnected) change nothing.
 * Its text form hides the tokens.
 */
public record SocialAccountRefreshClaim(SocialNetwork network, Instant claimedUntil, String accountId, String accessToken,
        Instant accessExpiresAt, String refreshToken, Instant refreshExpiresAt) {
    public SocialAccountRefreshClaim {
        Objects.requireNonNull(network, "network");
        Objects.requireNonNull(claimedUntil, "claimedUntil");
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(accessToken, "accessToken");
    }

    /**
     * Whether the credential the refresh is made with is still alive: the refresh token when the network has one
     * (TikTok), otherwise the access token itself (Threads, which cannot refresh an expired token).
     */
    public boolean refreshableAt(Instant now) {
        Instant end = Objects.nonNull(refreshToken) ? refreshExpiresAt : accessExpiresAt;
        return Objects.isNull(end) || end.isAfter(now);
    }

    @Override
    public String toString() {
        return "SocialAccountRefreshClaim[network=" + network + ", claimedUntil=" + claimedUntil + ", accountId=" + accountId
                + ", accessExpiresAt=" + accessExpiresAt + ", refreshExpiresAt=" + refreshExpiresAt + ", tokens=***]";
    }
}
