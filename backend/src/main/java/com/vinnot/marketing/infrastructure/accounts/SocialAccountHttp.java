package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The HTTP calls of the account adapters (#510 S5): JSON GETs and form POSTs with timeouts and no redirects. Failures
 * become {@link SocialAccountOAuthProvider.Failure}: a 4xx answer (other than 429) is a rejection, anything else
 * (network errors, timeouts, 429, 5xx, unreadable bodies) is transient. Response bodies and URLs are never logged or
 * carried in errors, because they hold tokens.
 */
public class SocialAccountHttp {
    private static final int OK_FIRST = 200;
    private static final int OK_LAST = 299;
    private static final int TOO_MANY_REQUESTS = 429;
    private static final int SERVER_ERRORS = 500;
    private static final int MAX_LIFETIME_DAYS = 400;
    private final HttpClient client;
    private final ObjectMapper json;
    private final Duration requestTimeout;

    public SocialAccountHttp(HttpClient client, ObjectMapper json, Duration requestTimeout) {
        this.client = client;
        this.json = json;
        this.requestTimeout = requestTimeout;
    }

    /** {@code base + path} with the query parameters URL-encoded in their order. */
    public static URI uri(String base, String path, Map<String, String> query) {
        String encoded = query.entrySet().stream().map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        return URI.create(base + path + (encoded.isEmpty() ? "" : "?" + encoded));
    }

    public static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /** GET with an optional bearer token. */
    public JsonNode get(URI uri, String bearer, String what) {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri).timeout(requestTimeout).header("Accept", "application/json").GET();
        if (Objects.nonNull(bearer)) {
            request.header("Authorization", "Bearer " + bearer);
        }
        return send(request.build(), what);
    }

    /** POST of an {@code application/x-www-form-urlencoded} body. */
    public JsonNode postForm(URI uri, Map<String, String> form, String what) {
        String body = form.entrySet().stream().map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        return send(HttpRequest.newBuilder(uri).timeout(requestTimeout).header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build(), what);
    }

    /** The field's text, required: a missing or blank value is an unusable (transient) answer. */
    public static String required(JsonNode node, String field, String what) {
        JsonNode value = node.path(field);
        String text = value.isValueNode() ? value.asText() : "";
        if (text.isBlank()) {
            throw new SocialAccountOAuthProvider.Failure(false, what + " answered without " + field);
        }
        return text;
    }

    /** {@code now} plus the field's seconds, required to be positive and at most {@value #MAX_LIFETIME_DAYS} days. */
    public static Instant expiry(JsonNode node, String field, Instant now, String what) {
        JsonNode value = node.path(field);
        if (!value.canConvertToLong() || value.asLong() <= 0 || value.asLong() > Duration.ofDays(MAX_LIFETIME_DAYS).toSeconds()) {
            throw new SocialAccountOAuthProvider.Failure(false, what + " answered without a valid " + field);
        }
        return now.plusSeconds(value.asLong());
    }

    private JsonNode send(HttpRequest request, String what) {
        HttpResponse<String> response;
        try {
            response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException unreachable) {
            throw new SocialAccountOAuthProvider.Failure(false, what + " could not be reached");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new SocialAccountOAuthProvider.Failure(false, what + " was interrupted");
        }
        int status = response.statusCode();
        if (status < OK_FIRST || status > OK_LAST) {
            boolean rejected = status != TOO_MANY_REQUESTS && status < SERVER_ERRORS;
            throw new SocialAccountOAuthProvider.Failure(rejected, what + " answered HTTP " + status);
        }
        try {
            return json.readTree(response.body());
        } catch (JacksonException unreadable) {
            throw new SocialAccountOAuthProvider.Failure(false, what + " answered an unreadable body");
        }
    }
}
