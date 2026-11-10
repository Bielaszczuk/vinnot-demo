package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.UnreadableSocialAccountException;
import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.application.port.in.RefreshSocialAccountsUseCase;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Refreshes OAuth tokens before they expire (#510 S5): Threads inside its last ten days (once the token is a day old),
 * TikTok within 30 minutes of its access token's end. A refusal, or a credential already expired, marks the account
 * REFRESH_FAILED and tells the admins to reconnect it once per failure episode; a transient failure is retried next run.
 * An account whose stored tokens cannot be read is marked failed by the store and reported the same way, and the run goes
 * on with the other networks.
 */
@Service
public class SocialAccountRefreshService implements RefreshSocialAccountsUseCase {
    public static final String TOKEN_EXPIRED = "TOKEN_EXPIRED";
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialAccountRefreshService.class);
    private final SocialAccountStore store;
    private final List<SocialAccountOAuthProvider> providers;
    private final SocialPublishingNotices notices;
    private final Clock clock;

    @Autowired
    public SocialAccountRefreshService(SocialAccountStore store, List<SocialAccountOAuthProvider> providers, SocialPublishingNotices notices) {
        this(store, providers, notices, Clock.systemUTC());
    }

    SocialAccountRefreshService(SocialAccountStore store, List<SocialAccountOAuthProvider> providers, SocialPublishingNotices notices,
            Clock clock) {
        this.store = store;
        this.providers = List.copyOf(providers);
        this.notices = notices;
        this.clock = clock;
    }

    @Override
    public int refreshDue() {
        Instant now = clock.instant();
        int refreshed = 0;
        for (SocialAccountOAuthProvider provider : providers) {
            if (!provider.configured()) {
                continue;
            }
            Optional<SocialAccountRefreshClaim> claim = claim(provider, now);
            if (claim.isPresent() && refresh(provider, claim.get(), now)) {
                refreshed++;
            }
        }
        return refreshed;
    }

    /** The network's account leased for a refresh when it is due; an unreadable one is reported and skipped. */
    private Optional<SocialAccountRefreshClaim> claim(SocialAccountOAuthProvider provider, Instant now) {
        try {
            return store.claimDueForRefresh(provider.network(), now, now.plus(provider.refreshLead()), now.minus(provider.minimumTokenAge()));
        } catch (UnreadableSocialAccountException unreadable) {
            LOGGER.warn("The stored {} tokens cannot be read ({}); the account must be connected again", unreadable.network(),
                    UnreadableSocialAccountException.CODE);
            if (unreadable.newlyFailed()) {
                notices.accountNeedsReconnect(unreadable.network());
            }
            return Optional.empty();
        }
    }

    private boolean refresh(SocialAccountOAuthProvider provider, SocialAccountRefreshClaim claim, Instant now) {
        if (!claim.refreshableAt(now)) {
            fail(claim, TOKEN_EXPIRED);
            return false;
        }
        try {
            SocialAccountGrant grant = provider.refresh(claim);
            boolean stored = store.markRefreshed(claim, grant, now);
            if (stored) {
                LOGGER.info("Refreshed the {} token until {}", claim.network(), grant.accessExpiresAt());
            } else {
                LOGGER.warn("The refreshed {} token was discarded: the refresh lease was lost", claim.network());
            }
            return stored;
        } catch (SocialAccountOAuthProvider.Failure failure) {
            if (failure.rejected()) {
                fail(claim, failure.code());
            } else {
                LOGGER.warn("The {} token refresh failed for now ({}); it is retried on the next run", claim.network(), failure.code());
                store.releaseClaim(claim, failure.code());
            }
            return false;
        }
    }

    private void fail(SocialAccountRefreshClaim claim, String errorCode) {
        LOGGER.warn("The {} token could not be refreshed ({}); the account must be connected again", claim.network(), errorCode);
        if (store.markRefreshFailed(claim, errorCode)) {
            notices.accountNeedsReconnect(claim.network());
        }
    }
}
