package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.MissingNode;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

/**
 * Bounded JSON calls to the social networks (#510): the token always travels in the {@code Authorization} header (never
 * in a URL that could be logged), redirects are not followed, the whole exchange including the body download has one
 * deadline and answers are capped. Transport failures surface as a retryable {@code UNAVAILABLE} whose detail names
 * only the failure type. Stateless and thread-safe.
 */
public final class SocialHttpTransport {

    static final int MAX_RESPONSE_BYTES = 1024 * 1024;
    private static final int HTTP_OK_MIN = 200;
    private static final int HTTP_OK_MAX = 299;

    /** One answer: its status and its JSON body, a missing node when the body is empty or not JSON. */
    record Reply(int status, JsonNode body) {
        boolean successful() {
            return status >= HTTP_OK_MIN && status <= HTTP_OK_MAX;
        }
    }

    private final HttpClient client;
    private final ObjectMapper mapper;
    private final Duration requestTimeout;

    public SocialHttpTransport(HttpClient client, ObjectMapper mapper, Duration requestTimeout) {
        this.client = Objects.requireNonNull(client, "client");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
        this.requestTimeout = Objects.requireNonNull(requestTimeout, "requestTimeout");
    }

    Reply get(URI uri, String token) {
        return send(builder(uri, token).GET().build());
    }

    Reply postForm(URI uri, Map<String, String> form, String token) {
        String body = form.entrySet().stream()
                .map(field -> encode(field.getKey()) + "=" + encode(field.getValue()))
                .collect(Collectors.joining("&"));
        return send(builder(uri, token).header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build());
    }

    /** A JSON POST; a null body sends none. */
    Reply postJson(URI uri, Object body, String token) {
        HttpRequest.BodyPublisher publisher = Objects.isNull(body) ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(body));
        return send(builder(uri, token).header("Content-Type", "application/json; charset=UTF-8")
                .POST(publisher).build());
    }

    static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private HttpRequest.Builder builder(URI uri, String token) {
        return HttpRequest.newBuilder(uri).timeout(requestTimeout).header("Accept", "application/json")
                .header("Authorization", "Bearer " + token);
    }

    private Reply send(HttpRequest request) {
        CompletableFuture<HttpResponse<byte[]>> pending = client.sendAsync(request,
                HttpResponse.BodyHandlers.limiting(HttpResponse.BodyHandlers.ofByteArray(), MAX_RESPONSE_BYTES));
        try {
            // Covers the body download too, not only the response headers.
            HttpResponse<byte[]> response = pending.get(requestTimeout.toNanos(), TimeUnit.NANOSECONDS);
            return new Reply(response.statusCode(), parse(response.body()));
        } catch (InterruptedException interrupted) {
            pending.cancel(true);
            Thread.currentThread().interrupt();
            throw new SocialPublishingException(Code.UNAVAILABLE, "interrupted while calling the network", interrupted);
        } catch (TimeoutException timeout) {
            pending.cancel(true);
            throw new SocialPublishingException(Code.UNAVAILABLE, "the network did not answer in time", timeout);
        } catch (ExecutionException failure) {
            Throwable cause = Objects.requireNonNullElse(failure.getCause(), failure);
            throw new SocialPublishingException(Code.UNAVAILABLE,
                    "network call failed: " + cause.getClass().getSimpleName(), cause);
        }
    }

    private JsonNode parse(byte[] body) {
        if (Objects.isNull(body) || body.length == 0) {
            return MissingNode.getInstance();
        }
        try {
            return mapper.readTree(body);
        } catch (JacksonException unreadable) {
            return MissingNode.getInstance();
        }
    }
}
