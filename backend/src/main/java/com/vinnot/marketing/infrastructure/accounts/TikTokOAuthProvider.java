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
 * TikTok Login Kit for Web (#510 S5), per the official docs (developers.tiktok.com, checked 2026-11-04): consent at
 * {@code www.tiktok.com/v2/auth/authorize/} (PKCE is only required for mobile and desktop apps), code exchange and refresh at
 * {@code open.tiktokapis.com/v2/oauth/token/}. Lifetimes always come from the answer's {@code expires_in} and
 * {@code refresh_expires_in} (the docs disagree on them), and every refresh returns a new refresh token that replaces
 * the stored one. Hosts are configurable.
 */
public class TikTokOAuthProvider implements SocialAccountOAuthProvider {
    static final String SCOPES = "user.info.basic,video.upload,video.publish,video.list";
    private static final Logger LOGGER = LoggerFactory.getLogger(TikTokOAuthProvider.class);
    private static final Duration REFRESH_LEAD = Duration.ofMinutes(30);
    private static final String TOKEN_PATH = "/v2/oauth/token/";
    private final SocialAccountHttp http;
    private final Settings settings;
    private final Clock clock;

    public TikTokOAuthProvider(SocialAccountHttp http, Settings settings, Clock clock) {
        this.http = http;
        this.settings = settings;
        this.clock = clock;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.TIKTOK;
    }

    @Override
    public boolean configured() {
        return present(settings.clientKey()) && present(settings.clientSecret()) && present(settings.redirectUri());
    }

    @Override
    public String authorizeUrl(String state) {
        Map<String, String> query = new LinkedHashMap<>();
        query.put("client_key", settings.clientKey());
        query.put("scope", SCOPES);
        query.put("response_type", "code");
        query.put("redirect_uri", settings.redirectUri());
        query.put("state", state);
        return SocialAccountHttp.uri(settings.authorizeUrl(), "", query).toString();
    }

    @Override
    public SocialAccountGrant exchange(String code) {
        Map<String, String> form = new LinkedHashMap<>();
        form.put("client_key", settings.clientKey());
        form.put("client_secret", settings.clientSecret());
        form.put("code", code);
        form.put("grant_type", "authorization_code");
        form.put("redirect_uri", settings.redirectUri());
        JsonNode answer = token(form, "The TikTok code exchange");
        String openId = SocialAccountHttp.required(answer, "open_id", "The TikTok code exchange");
        String accessToken = SocialAccountHttp.required(answer, "access_token", "The TikTok code exchange");
        return grant(answer, openId, displayName(accessToken), "The TikTok code exchange");
    }

    @Override
    public SocialAccountGrant refresh(SocialAccountRefreshClaim claim) {
        if (Objects.isNull(claim.refreshToken())) {
            throw new Failure(true, "The TikTok account has no refresh token");
        }
        Map<String, String> form = new LinkedHashMap<>();
        form.put("client_key", settings.clientKey());
        form.put("client_secret", settings.clientSecret());
        form.put("grant_type", "refresh_token");
        form.put("refresh_token", claim.refreshToken());
        JsonNode answer = token(form, "The TikTok token refresh");
        String openId = answer.path("open_id").asText();
        if (!openId.isBlank() && !openId.equals(claim.accountId())) {
            throw new Failure(true, "The TikTok token refresh answered for another account");
        }
        return grant(answer, claim.accountId(), null, "The TikTok token refresh");
    }

    private JsonNode token(Map<String, String> form, String what) {
        JsonNode answer = http.postForm(SocialAccountHttp.uri(settings.apiBaseUrl(), TOKEN_PATH, Map.of()), form, what);
        if (answer.path("access_token").asText().isBlank() && !answer.path("error").asText().isBlank()) {
            // TikTok may describe a refused grant in a successful answer's body.
            throw new Failure(true, what + " was refused");
        }
        return answer;
    }

    private SocialAccountGrant grant(JsonNode answer, String openId, String displayName, String what) {
        Instant now = clock.instant();
        return new SocialAccountGrant(openId, displayName, SocialAccountHttp.required(answer, "access_token", what),
                SocialAccountHttp.expiry(answer, "expires_in", now, what), SocialAccountHttp.required(answer, "refresh_token", what),
                SocialAccountHttp.expiry(answer, "refresh_expires_in", now, what));
    }

    private String displayName(String accessToken) {
        try {
            JsonNode info = http.get(SocialAccountHttp.uri(settings.apiBaseUrl(), "/v2/user/info/", Map.of("fields", "open_id,display_name")),
                    accessToken, "The TikTok profile");
            String name = info.path("data").path("user").path("display_name").asText();
            return name.isBlank() ? null : name;
        } catch (Failure failure) {
            LOGGER.warn("The TikTok display name could not be read ({}); the account is stored without it", failure.code());
            return null;
        }
    }

    @Override
    public Duration refreshLead() {
        return REFRESH_LEAD;
    }

    @Override
    public Duration minimumTokenAge() {
        return Duration.ZERO;
    }

    private static boolean present(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    /** {@code app.marketing.accounts.tiktok.*}. */
    public record Settings(String clientKey, String clientSecret, String redirectUri, String authorizeUrl, String apiBaseUrl) {
    }
}
