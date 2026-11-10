package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.domain.model.SocialAccount;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * The tokens the publishers call each network with (#510 S5). Instagram and the Facebook Page use the Meta business
 * system-user token from configuration (it does not expire); the Page publisher needs the Page's own token, taken from
 * {@code page-access-token} when configured, otherwise read from the Graph API with the system-user token and kept in
 * memory for an hour (a failed read is not kept, so the next call reads again). Threads and TikTok use the stored OAuth
 * account, only while it is connected and its token has not expired. Empty means not configured or not connected.
 */
public class ConfiguredSocialAccountTokens implements SocialAccountTokens {
    static final Duration PAGE_TOKEN_TTL = Duration.ofHours(1);
    private static final Logger LOGGER = LoggerFactory.getLogger(ConfiguredSocialAccountTokens.class);
    private final MetaSecrets meta;
    private final SocialAccountStore store;
    private final MetaPageTokenClient pages;
    private final Clock clock;
    private CachedToken pageToken;

    public ConfiguredSocialAccountTokens(MetaSecrets meta, SocialAccountStore store, MetaPageTokenClient pages, Clock clock) {
        this.meta = meta;
        this.store = store;
        this.pages = pages;
        this.clock = clock;
    }

    @Override
    public Optional<SocialAccessToken> tokenFor(SocialNetwork network) {
        return switch (network) {
            case INSTAGRAM -> present(meta.accessToken()) && present(meta.instagramUserId())
                    ? Optional.of(new SocialAccessToken(meta.accessToken(), meta.instagramUserId(), null)) : Optional.empty();
            case FACEBOOK -> page();
            default -> stored(network);
        };
    }

    private Optional<SocialAccessToken> page() {
        if (!present(meta.pageId())) {
            return Optional.empty();
        }
        if (present(meta.pageAccessToken())) {
            return Optional.of(new SocialAccessToken(meta.pageAccessToken(), meta.pageId(), null));
        }
        if (!present(meta.accessToken())) {
            return Optional.empty();
        }
        return fetchedPageToken().map(token -> new SocialAccessToken(token, meta.pageId(), null));
    }

    private synchronized Optional<String> fetchedPageToken() {
        Instant now = clock.instant();
        if (Objects.nonNull(pageToken) && pageToken.expiresAt().isAfter(now)) {
            return Optional.of(pageToken.token());
        }
        pageToken = null;
        try {
            String token = pages.pageToken(meta.accessToken(), meta.pageId());
            pageToken = new CachedToken(token, now.plus(PAGE_TOKEN_TTL));
            return Optional.of(token);
        } catch (SocialAccountOAuthProvider.Failure failure) {
            LOGGER.warn("The Facebook Page token could not be read ({}); Facebook counts as not connected", failure.code());
            return Optional.empty();
        }
    }

    private Optional<SocialAccessToken> stored(SocialNetwork network) {
        Optional<SocialAccount> account;
        try {
            account = store.find(network);
        } catch (IllegalStateException unreadable) {
            LOGGER.warn("The stored {} account could not be read ({}); it counts as not connected", network, unreadable.getMessage());
            return Optional.empty();
        }
        Instant now = clock.instant();
        return account.filter(stored -> stored.usableAt(now))
                .map(stored -> new SocialAccessToken(stored.accessToken(), stored.accountId(), stored.accessExpiresAt()));
    }

    private static boolean present(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    /** {@code app.marketing.accounts.meta.*}: the system-user token, the ids and the optional Page token. Its text form hides tokens. */
    public record MetaSecrets(String accessToken, String instagramUserId, String pageId, String pageAccessToken) {
        @Override
        public String toString() {
            return "MetaSecrets[instagramUserId=" + instagramUserId + ", pageId=" + pageId + ", tokens=***]";
        }
    }

    private record CachedToken(String token, Instant expiresAt) {
        @Override
        public String toString() {
            return "CachedToken[token=***, expiresAt=" + expiresAt + "]";
        }
    }
}
