package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Threads OAuth (#510 S5), per the official docs (developers.facebook.com/docs/threads, checked 2026-11-04): consent at
 * {@code threads.com/oauth/authorize}, the code exchanged at {@code graph.threads.com/oauth/access_token} for a short-lived
 * token and the user id, then for a 60-day token ({@code th_exchange_token}), refreshed with {@code th_refresh_token}
 * once it is at least 24 hours old and before it expires. Hosts are configurable.
 */
public class ThreadsOAuthProvider implements SocialAccountOAuthProvider {
    static final String SCOPES = "threads_basic,threads_content_publish,threads_manage_insights";
    private static final Logger LOGGER = LoggerFactory.getLogger(ThreadsOAuthProvider.class);
    private static final Duration REFRESH_LEAD = Duration.ofDays(10);
    private static final Duration MINIMUM_AGE = Duration.ofHours(24);
    private static final String CODE_SUFFIX = "#_";
    private final SocialAccountHttp http;
    private final Settings settings;
    private final Clock clock;

    public ThreadsOAuthProvider(SocialAccountHttp http, Settings settings, Clock clock) {
        this.http = http;
        this.settings = settings;
        this.clock = clock;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.THREADS;
    }

    @Override
    public boolean configured() {
        return present(settings.clientId()) && present(settings.clientSecret()) && present(settings.redirectUri());
    }

    @Override
    public String authorizeUrl(String state) {
        Map<String, String> query = new LinkedHashMap<>();
        query.put("client_id", settings.clientId());
        query.put("redirect_uri", settings.redirectUri());
        query.put("scope", SCOPES);
        query.put("response_type", "code");
        query.put("state", state);
        return SocialAccountHttp.uri(settings.authorizeUrl(), "", query).toString();
    }

    @Override
    public SocialAccountGrant exchange(String code) {
        String cleanCode = code.endsWith(CODE_SUFFIX) ? code.substring(0, code.length() - CODE_SUFFIX.length()) : code;
        Map<String, String> form = new LinkedHashMap<>();
        form.put("client_id", settings.clientId());
        form.put("client_secret", settings.clientSecret());
        form.put("grant_type", "authorization_code");
        form.put("redirect_uri", settings.redirectUri());
        form.put("code", cleanCode);
        JsonNode shortLived = http.postForm(SocialAccountHttp.uri(settings.apiBaseUrl(), "/oauth/access_token", Map.of()), form,
                "The Threads code exchange");
        final String userId = SocialAccountHttp.required(shortLived, "user_id", "The Threads code exchange");
        Map<String, String> query = new LinkedHashMap<>();
        query.put("grant_type", "th_exchange_token");
        query.put("client_secret", settings.clientSecret());
        query.put("access_token", SocialAccountHttp.required(shortLived, "access_token", "The Threads code exchange"));
        JsonNode longLived = http.get(SocialAccountHttp.uri(settings.apiBaseUrl(), "/access_token", query), null,
                "The Threads long-lived token exchange");
        String token = SocialAccountHttp.required(longLived, "access_token", "The Threads long-lived token exchange");
        Instant expiresAt = SocialAccountHttp.expiry(longLived, "expires_in", clock.instant(), "The Threads long-lived token exchange");
        return new SocialAccountGrant(userId, username(token), token, expiresAt, null, null);
    }

    private String username(String token) {
        try {
            Map<String, String> query = new LinkedHashMap<>();
            query.put("fields", "id,username");
            query.put("access_token", token);
            JsonNode me = http.get(SocialAccountHttp.uri(settings.apiBaseUrl(), "/v1.0/me", query), null, "The Threads profile");
            String username = me.path("username").asText();
            return username.isBlank() ? null : username;
        } catch (Failure failure) {
            LOGGER.warn("The Threads username could not be read ({}); the account is stored without it", failure.code());
            return null;
        }
    }

    @Override
    public SocialAccountGrant refresh(SocialAccountRefreshClaim claim) {
        Map<String, String> query = new LinkedHashMap<>();
        query.put("grant_type", "th_refresh_token");
        query.put("access_token", claim.accessToken());
        JsonNode refreshed = http.get(SocialAccountHttp.uri(settings.apiBaseUrl(), "/refresh_access_token", query), null,
                "The Threads token refresh");
        return new SocialAccountGrant(claim.accountId(), null, SocialAccountHttp.required(refreshed, "access_token", "The Threads token refresh"),
                SocialAccountHttp.expiry(refreshed, "expires_in", clock.instant(), "The Threads token refresh"), null, null);
    }

    @Override
    public Duration refreshLead() {
        return REFRESH_LEAD;
    }

    @Override
    public Duration minimumTokenAge() {
        return MINIMUM_AGE;
    }

    private static boolean present(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    /** {@code app.marketing.accounts.threads.*}. */
    public record Settings(String clientId, String clientSecret, String redirectUri, String authorizeUrl, String apiBaseUrl) {
    }
}
