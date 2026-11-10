package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.exception.UnreadableSocialAccountException;
import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.application.model.SocialAccountSummary;
import com.vinnot.marketing.domain.model.SocialAccount;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The accounts connected with OAuth (#510 S5), one per network, with their tokens encrypted at rest. The account's
 * {@code updatedAt} is when its tokens were last written (connected or refreshed); failure marks leave it alone.
 */
public interface SocialAccountStore {

    /** False while no encryption key is configured: nothing can be connected then. */
    boolean encryptionReady();

    /** Stores the network's account (replacing any earlier one) as connected, clearing its error and any refresh lease. */
    void connect(SocialNetwork network, SocialAccountGrant grant, UUID connectedBy, Instant now);

    /** The network's account with its decrypted tokens. */
    Optional<SocialAccount> find(SocialNetwork network);

    /** Every stored account without its tokens. */
    List<SocialAccountSummary> summaries();

    /** Removes the network's account; false when there was none. */
    boolean delete(SocialNetwork network);

    /**
     * Leases the network's account to this caller when it is connected, its access token expires at or before
     * {@code renewBefore}, its tokens were written at or before {@code writtenBefore} and no unexpired lease holds it.
     * At most one caller holds a lease at a time. When the leased account's tokens cannot be decrypted it is marked
     * REFRESH_FAILED with {@link UnreadableSocialAccountException#CODE}, the lease ends and
     * {@link UnreadableSocialAccountException} is thrown.
     */
    Optional<SocialAccountRefreshClaim> claimDueForRefresh(SocialNetwork network, Instant now, Instant renewBefore, Instant writtenBefore);

    /**
     * Writes the refreshed tokens (a null refresh token or expiry keeps the stored one) and ends the lease; false when
     * the lease was lost and nothing changed.
     */
    boolean markRefreshed(SocialAccountRefreshClaim claim, SocialAccountGrant grant, Instant now);

    /**
     * Marks the account REFRESH_FAILED with the error and ends the lease; true only when this call moved it from
     * CONNECTED, so a failure episode is reported once.
     */
    boolean markRefreshFailed(SocialAccountRefreshClaim claim, String errorCode);

    /** Ends the lease after a transient failure, keeping the account connected and recording the error. */
    void releaseClaim(SocialAccountRefreshClaim claim, String errorCode);
}
