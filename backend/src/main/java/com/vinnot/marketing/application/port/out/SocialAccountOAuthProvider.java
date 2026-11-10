package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Duration;

/** A network connected from the admin with OAuth (#510 S5): Threads or TikTok, one bean each. */
public interface SocialAccountOAuthProvider {

    SocialNetwork network();

    /** False while the app's client id, secret or redirect URI is missing. */
    boolean configured();

    /** The network's consent page for the admin, carrying the single-use {@code state}. */
    String authorizeUrl(String state);

    /** Exchanges the authorization code for the account and its longest-lived tokens. */
    SocialAccountGrant exchange(String code);

    /** Refreshes the claimed account's tokens. */
    SocialAccountGrant refresh(SocialAccountRefreshClaim claim);

    /** How long before its access token expires an account is refreshed. */
    Duration refreshLead();

    /** How old a token must be before the network accepts refreshing it. */
    Duration minimumTokenAge();

    /**
     * The network refused the request ({@code rejected}: the code or token is no longer valid) or could not answer
     * (transient: network errors, rate limits, 5xx). It never carries a token or a response body.
     */
    final class Failure extends RuntimeException {
        public static final String REJECTED = "PROVIDER_REJECTED";
        public static final String UNAVAILABLE = "PROVIDER_UNAVAILABLE";
        private final boolean rejected;

        public Failure(boolean rejected, String detail) {
            super(detail);
            this.rejected = rejected;
        }

        public boolean rejected() {
            return rejected;
        }

        /** The error code stored and shown to the admin. */
        public String code() {
            return rejected ? REJECTED : UNAVAILABLE;
        }
    }
}
