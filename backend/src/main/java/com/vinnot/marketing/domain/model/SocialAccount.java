package com.vinnot.marketing.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * An account connected with OAuth (#510 S5), Threads or TikTok, with its decrypted tokens. {@code refreshToken} and
 * {@code refreshExpiresAt} are null for a network that refreshes with the access token itself (Threads); a null expiry
 * never ends. Its text form hides the tokens.
 */
public record SocialAccount(SocialNetwork network, String accountId, String displayName, String accessToken, String refreshToken,
        Instant accessExpiresAt, Instant refreshExpiresAt, SocialAccountStatus status, String lastError, UUID connectedBy,
        Instant connectedAt, Instant updatedAt) {
    public SocialAccount {
        Objects.requireNonNull(network, "network");
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(accessToken, "accessToken");
        Objects.requireNonNull(status, "status");
    }

    /** True while the account is connected and its access token has not expired: only then the agent publishes with it. */
    public boolean usableAt(Instant now) {
        return status == SocialAccountStatus.CONNECTED && (Objects.isNull(accessExpiresAt) || accessExpiresAt.isAfter(now));
    }

    @Override
    public String toString() {
        return "SocialAccount[network=" + network + ", accountId=" + accountId + ", status=" + status + ", accessExpiresAt="
                + accessExpiresAt + ", refreshExpiresAt=" + refreshExpiresAt + ", tokens=***]";
    }
}
