package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import tools.jackson.databind.JsonNode;

import java.net.URI;
import java.util.Map;
import java.util.Objects;

/**
 * The TikTok Content Posting API (#510): JSON POSTs with the user token as a bearer header, answers in the
 * {@code {data, error: {code, message, log_id}}} envelope where any {@code error.code} other than {@code ok} is a
 * failure, whatever the HTTP status. Stateless and thread-safe.
 */
final class TikTokApi {

    private static final int HTTP_UNAUTHORIZED = 401;
    private static final int HTTP_TOO_MANY_REQUESTS = 429;
    private static final int HTTP_SERVER_ERROR = 500;
    /** Error codes (init/creator info) and fail reasons (status) whose meaning does not depend on the HTTP status. */
    private static final Map<String, Code> KNOWN = Map.ofEntries(
            Map.entry("url_ownership_unverified", Code.MEDIA_NOT_PUBLIC),
            Map.entry("spam_risk_too_many_posts", Code.RATE_LIMITED),
            Map.entry("spam_risk_too_many_pending_share", Code.RATE_LIMITED),
            Map.entry("reached_active_user_cap", Code.RATE_LIMITED),
            Map.entry("rate_limit_exceeded", Code.RATE_LIMITED),
            Map.entry("access_token_invalid", Code.TOKEN_INVALID),
            Map.entry("scope_not_authorized", Code.TOKEN_INVALID),
            Map.entry("auth_removed", Code.TOKEN_INVALID),
            Map.entry("unaudited_client_can_only_post_to_private_accounts", Code.REJECTED),
            Map.entry("internal", Code.UNAVAILABLE),
            Map.entry("internal_error", Code.UNAVAILABLE));

    private final SocialHttpTransport http;
    private final String baseUrl;

    TikTokApi(SocialHttpTransport http, String baseUrl) {
        this.http = Objects.requireNonNull(http, "http");
        this.baseUrl = GraphApi.stripTrailingSlash(baseUrl);
    }

    /** POSTs the body (none when null) and returns the answer's {@code data}. */
    JsonNode post(String path, Object body, String token) {
        SocialHttpTransport.Reply reply = http.postJson(URI.create(baseUrl + path), body, token);
        JsonNode error = reply.body().path("error");
        String code = error.path("code").asText("");
        if (reply.successful() && (code.isEmpty() || "ok".equals(code))) {
            if (!reply.body().isObject()) {
                throw new SocialPublishingException(Code.REJECTED, "unreadable answer, HTTP " + reply.status());
            }
            return reply.body().path("data");
        }
        String detail = "HTTP " + reply.status() + (code.isEmpty() ? "" : " " + code)
                + (error.path("message").asText("").isBlank() ? ""
                : ": " + GraphApi.safe(error.path("message").asText(""), token));
        throw new SocialPublishingException(byStatus(reply.status(), code), detail);
    }

    /** The code for a publish that ended {@code FAILED}: a known reason, otherwise a media rejection. */
    static Code failReason(String reason) {
        return KNOWN.getOrDefault(reason, Code.MEDIA_REJECTED);
    }

    private static Code byStatus(int status, String code) {
        if (KNOWN.containsKey(code)) {
            return KNOWN.get(code);
        }
        if (status == HTTP_UNAUTHORIZED) {
            return Code.TOKEN_INVALID;
        }
        if (status == HTTP_TOO_MANY_REQUESTS) {
            return Code.RATE_LIMITED;
        }
        return status >= HTTP_SERVER_ERROR ? Code.UNAVAILABLE : Code.REJECTED;
    }
}
