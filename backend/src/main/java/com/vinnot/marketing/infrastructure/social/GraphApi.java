package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import tools.jackson.databind.JsonNode;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * A Meta Graph-style API (#510): the Facebook Graph API for Instagram and Pages, or the Threads API. Turns Meta's error
 * envelope ({@code error.code}, {@code error_subcode}, {@code is_transient}, {@code message}) into a
 * {@link SocialPublishingException} code. The token goes in the {@code Authorization} header and, for POSTs, also as
 * the documented {@code access_token} form field; never in a query string. Stateless and thread-safe.
 */
final class GraphApi {

    private static final int HTTP_UNAUTHORIZED = 401;
    private static final int HTTP_FORBIDDEN = 403;
    private static final int HTTP_NOT_FOUND = 404;
    private static final int HTTP_TOO_MANY_REQUESTS = 429;
    private static final int HTTP_BAD_REQUEST = 400;
    private static final int HTTP_SERVER_ERROR = 500;
    private static final int TOKEN_EXPIRED_OR_INVALID = 190;
    private static final int INVALID_PARAMETER = 100;
    private static final int OBJECT_DOES_NOT_EXIST = 33;
    /** Application, user, Page and custom rate limits. */
    private static final Set<Integer> RATE_LIMIT_CODES = Set.of(4, 17, 32, 613);
    /** Instagram: the account reached its daily publishing limit. */
    private static final int DAILY_PUBLISHING_LIMIT_SUBCODE = 2_207_042;
    /** Missing or invalid image file, media could not be fetched, unsupported aspect ratio and similar. */
    private static final Set<Integer> MEDIA_CODES = Set.of(324, 9004, 36000, 36001, 36003);
    private static final int MAX_MESSAGE_LENGTH = 160;

    private final SocialHttpTransport http;
    private final String root;

    GraphApi(SocialHttpTransport http, String baseUrl, String version) {
        this.http = Objects.requireNonNull(http, "http");
        this.root = stripTrailingSlash(baseUrl) + "/" + version;
    }

    /** GET {@code /{id}} or {@code /{id}/{edge}}. */
    JsonNode get(String id, String edge, Map<String, String> query, String token) {
        return checked(http.get(uri(id, edge, query), token), token, false);
    }

    /** Like {@link #get} but empty when the object no longer exists (deleted post, unknown id). */
    Optional<JsonNode> find(String id, String edge, Map<String, String> query, String token) {
        SocialHttpTransport.Reply reply = http.get(uri(id, edge, query), token);
        JsonNode error = reply.body().path("error");
        if (reply.status() == HTTP_NOT_FOUND || (error.path("code").asInt(-1) == INVALID_PARAMETER
                && error.path("error_subcode").asInt(-1) == OBJECT_DOES_NOT_EXIST)) {
            return Optional.empty();
        }
        return Optional.of(checked(reply, token, false));
    }

    /**
     * POST a form to {@code /{id}/{edge}}.
     *
     * @param mediaStep whether this call hands images to the network, so a bad request means the media was refused
     */
    JsonNode post(String id, String edge, Map<String, String> form, String token, boolean mediaStep) {
        Map<String, String> fields = new LinkedHashMap<>(form);
        fields.put("access_token", token);
        return checked(http.postForm(uri(id, edge, Map.of()), fields, token), token, mediaStep);
    }

    private URI uri(String id, String edge, Map<String, String> query) {
        String path = root + "/" + SocialHttpTransport.encode(id)
                + (Objects.isNull(edge) ? "" : "/" + SocialHttpTransport.encode(edge));
        String parameters = query.entrySet().stream()
                .map(entry -> SocialHttpTransport.encode(entry.getKey()) + "=" + SocialHttpTransport.encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        return URI.create(parameters.isEmpty() ? path : path + "?" + parameters);
    }

    private static JsonNode checked(SocialHttpTransport.Reply reply, String token, boolean mediaStep) {
        if (reply.successful()) {
            if (reply.body().isMissingNode() || !reply.body().isObject()) {
                throw new SocialPublishingException(Code.REJECTED, "unreadable answer, HTTP " + reply.status());
            }
            return reply.body();
        }
        throw failure(reply, token, mediaStep);
    }

    static SocialPublishingException failure(SocialHttpTransport.Reply reply, String token, boolean mediaStep) {
        int status = reply.status();
        JsonNode error = reply.body().path("error");
        int code = error.path("code").asInt(-1);
        int subcode = error.path("error_subcode").asInt(-1);
        String message = error.path("message").asText("");
        String detail = detail(status, code, subcode, message, token);
        return new SocialPublishingException(classify(status, code, subcode, message,
                error.path("is_transient").asBoolean(false), mediaStep), detail);
    }

    private static Code classify(int status, int code, int subcode, String message, boolean transientError,
            boolean mediaStep) {
        if (status == HTTP_UNAUTHORIZED || status == HTTP_FORBIDDEN || code == TOKEN_EXPIRED_OR_INVALID) {
            return Code.TOKEN_INVALID;
        }
        if (status == HTTP_TOO_MANY_REQUESTS || RATE_LIMIT_CODES.contains(code)
                || subcode == DAILY_PUBLISHING_LIMIT_SUBCODE || message.toLowerCase(Locale.ROOT).contains("rate limit")) {
            return Code.RATE_LIMITED;
        }
        if (status >= HTTP_SERVER_ERROR || transientError) {
            return Code.UNAVAILABLE;
        }
        if (MEDIA_CODES.contains(code) || (mediaStep && status == HTTP_BAD_REQUEST)) {
            return Code.MEDIA_REJECTED;
        }
        return Code.REJECTED;
    }

    private static String detail(int status, int code, int subcode, String message, String token) {
        StringBuilder detail = new StringBuilder("HTTP ").append(status);
        if (code >= 0) {
            detail.append(" code ").append(code);
        }
        if (subcode >= 0) {
            detail.append('/').append(subcode);
        }
        if (!message.isBlank()) {
            detail.append(": ").append(safe(message, token));
        }
        return detail.toString();
    }

    /** A network message cut short, with the token masked should the network ever echo it. */
    static String safe(String message, String token) {
        String masked = token.isEmpty() ? message : message.replace(token, "***");
        return masked.length() > MAX_MESSAGE_LENGTH ? masked.substring(0, MAX_MESSAGE_LENGTH) + "…" : masked;
    }

    static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
