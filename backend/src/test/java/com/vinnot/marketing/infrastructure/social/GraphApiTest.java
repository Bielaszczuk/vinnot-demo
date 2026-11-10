package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.time.Duration;
import java.util.Map;

import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.TOKEN;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.failure;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.transport;
import static org.assertj.core.api.Assertions.assertThat;

class GraphApiTest {

    private final FakeNetworkServer server = FakeNetworkServer.start();
    private final GraphApi graph = new GraphApi(transport(), server.baseUrl(), "v27.0");

    @AfterEach
    void close() {
        server.close();
    }

    @Test
    void getSendsTheTokenAsABearerHeaderNeverInTheQuery() {
        server.on("GET", "/v27.0/42/insights", 200, "{\"data\":[]}");

        var body = graph.get("42", "insights", Map.of("metric", "views,reach"), TOKEN);

        assertThat(body.path("data").isArray()).isTrue();
        var request = server.only("GET", "/v27.0/42/insights");
        assertThat(request.authorization()).isEqualTo("Bearer " + TOKEN);
        assertThat(request.queryParams()).containsExactly(Map.entry("metric", "views,reach"));
        assertThat(request.query()).doesNotContain(TOKEN);
    }

    @Test
    void getWithoutAnEdgeAddressesTheObjectItself() {
        server.on("GET", "/v27.0/17_99", 200, "{\"permalink_url\":\"https://facebook.test/p\"}");

        assertThat(graph.get("17_99", null, Map.of("fields", "permalink_url"), TOKEN).path("permalink_url").asText())
                .isEqualTo("https://facebook.test/p");
    }

    @Test
    void postSendsAnEncodedFormWithTheTokenInTheBodyAndTheHeader() {
        server.on("POST", "/v27.0/42/media", 200, "{\"id\":\"c1\"}");

        var body = graph.post("42", "media", Map.of("caption", "Malbec & más #vino"), TOKEN, true);

        assertThat(body.path("id").asText()).isEqualTo("c1");
        var request = server.only("POST", "/v27.0/42/media");
        assertThat(request.contentType()).startsWith("application/x-www-form-urlencoded");
        assertThat(request.authorization()).isEqualTo("Bearer " + TOKEN);
        assertThat(request.form()).containsEntry("caption", "Malbec & más #vino").containsEntry("access_token", TOKEN);
    }

    @ParameterizedTest
    @CsvSource({
        "401, 0, 0, Invalid OAuth, TOKEN_INVALID",
        "403, 0, 0, Forbidden, TOKEN_INVALID",
        "400, 190, 460, Session expired, TOKEN_INVALID",
        "429, 0, 0, Slow down, RATE_LIMITED",
        "400, 4, 0, Application request limit reached, RATE_LIMITED",
        "400, 17, 0, User request limit reached, RATE_LIMITED",
        "400, 32, 0, Page request limit reached, RATE_LIMITED",
        "400, 613, 0, Calls within one hour exceeded, RATE_LIMITED",
        "400, 9, 2207042, Daily posts reached, RATE_LIMITED",
        "400, 100, 0, The rate limit was hit, RATE_LIMITED",
        "500, 1, 0, Unknown error, UNAVAILABLE",
        "503, 0, 0, Down, UNAVAILABLE",
        "400, 324, 0, Missing or invalid image file, MEDIA_REJECTED",
        "400, 9004, 2207052, Media could not be fetched, MEDIA_REJECTED",
        "400, 36003, 2207009, Aspect ratio, MEDIA_REJECTED",
        "400, 100, 0, Invalid parameter, REJECTED",
        "404, 803, 0, Unknown object, REJECTED"
    })
    void mapsTheNetworkErrorToACode(int status, int code, int subcode, String message, Code expected) {
        server.on("POST", "/v27.0/42/media_publish", status, error(code, subcode, message, false));

        var failure = failure(() -> graph.post("42", "media_publish", Map.of("creation_id", "c1"), TOKEN, false));

        assertThat(failure.code()).isEqualTo(expected);
        assertThat(failure.detail()).contains("HTTP " + status);
    }

    @Test
    void aBadRequestWhileCreatingMediaIsAMediaRejection() {
        server.on("POST", "/v27.0/42/media", 400, error(100, 0, "Invalid parameter", false));

        assertThat(failure(() -> graph.post("42", "media", Map.of(), TOKEN, true)).code())
                .isEqualTo(Code.MEDIA_REJECTED);
    }

    @Test
    void aTransientErrorIsUnavailable() {
        server.on("POST", "/v27.0/42/media", 400, error(2, 0, "Service temporarily unavailable", true));

        assertThat(failure(() -> graph.post("42", "media", Map.of(), TOKEN, false)).code()).isEqualTo(Code.UNAVAILABLE);
    }

    @Test
    void aTokenEchoedByTheNetworkNeverReachesTheDetail() {
        server.on("GET", "/v27.0/42", 400, error(100, 0, "Bad token " + TOKEN + " given", false));

        var failure = failure(() -> graph.get("42", null, Map.of(), TOKEN));

        assertThat(failure.detail()).contains("Bad token *** given");
    }

    @Test
    void aLongErrorMessageIsShortened() {
        server.on("GET", "/v27.0/42", 400, error(100, 0, "x".repeat(1000), false));

        assertThat(failure(() -> graph.get("42", null, Map.of(), TOKEN)).detail().length()).isLessThan(300);
    }

    @Test
    void anErrorWithoutAJsonBodyIsMappedByStatus() {
        server.on("GET", "/v27.0/42", 502, "<html>bad gateway</html>");

        var failure = failure(() -> graph.get("42", null, Map.of(), TOKEN));

        assertThat(failure.code()).isEqualTo(Code.UNAVAILABLE);
        assertThat(failure.detail()).isEqualTo("HTTP 502");
    }

    @Test
    void anUnreadableSuccessIsRejectedNotRetried() {
        server.on("POST", "/v27.0/42/media_publish", 200, "not json");

        assertThat(failure(() -> graph.post("42", "media_publish", Map.of(), TOKEN, false)).code())
                .isEqualTo(Code.REJECTED);
    }

    @Test
    void anEmptySuccessIsRejected() {
        server.on("POST", "/v27.0/42/media_publish", 200, "");

        assertThat(failure(() -> graph.post("42", "media_publish", Map.of(), TOKEN, false)).code())
                .isEqualTo(Code.REJECTED);
    }

    @Test
    void findIsEmptyWhenTheObjectNoLongerExists() {
        server.on("GET", "/v27.0/gone/insights", 400, error(100, 33, "Object does not exist", false));
        server.on("GET", "/v27.0/missing/insights", 404, "");
        server.on("GET", "/v27.0/here/insights", 200, "{\"data\":[]}");

        assertThat(graph.find("gone", "insights", Map.of(), TOKEN)).isEmpty();
        assertThat(graph.find("missing", "insights", Map.of(), TOKEN)).isEmpty();
        assertThat(graph.find("here", "insights", Map.of(), TOKEN)).isPresent();
    }

    @Test
    void findStillFailsOnOtherErrors() {
        server.on("GET", "/v27.0/42/insights", 400, error(190, 0, "Expired", false));

        assertThat(failure(() -> graph.find("42", "insights", Map.of(), TOKEN)).code()).isEqualTo(Code.TOKEN_INVALID);
    }

    @Test
    void aSlowAnswerTimesOutAsUnavailable() {
        server.on("GET", "/v27.0/42", 200, "{}", 2_000);
        var slow = new GraphApi(transport(Duration.ofMillis(200)), server.baseUrl(), "v27.0");

        var failure = failure(() -> slow.get("42", null, Map.of(), TOKEN));

        assertThat(failure.code()).isEqualTo(Code.UNAVAILABLE);
        assertThat(failure.retryable()).isTrue();
    }

    @Test
    void anOversizedAnswerIsUnavailable() {
        server.on("GET", "/v27.0/42", 200, "{\"a\":\"" + "x".repeat(SocialHttpTransport.MAX_RESPONSE_BYTES) + "\"}");

        assertThat(failure(() -> graph.get("42", null, Map.of(), TOKEN)).code()).isEqualTo(Code.UNAVAILABLE);
    }

    @Test
    void anUnreachableHostIsUnavailable() throws Exception {
        int port;
        try (var socket = new ServerSocket()) {
            socket.bind(new InetSocketAddress("127.0.0.1", 0));
            port = socket.getLocalPort();
        }
        var unreachable = new GraphApi(transport(), "http://127.0.0.1:" + port, "v27.0");

        var failure = failure(() -> unreachable.get("42", null, Map.of(), TOKEN));

        assertThat(failure.code()).isEqualTo(Code.UNAVAILABLE);
        assertThat(failure.detail()).doesNotContain("127.0.0.1");
    }

    @ParameterizedTest
    @ValueSource(strings = {"get", "post"})
    void anInterruptedCallIsUnavailableAndKeepsTheInterrupt(String method) {
        server.on("GET", "/v27.0/42", 200, "{}", 2_000);
        server.on("POST", "/v27.0/42", 200, "{}", 2_000);
        Thread.currentThread().interrupt();
        try {
            var failure = failure(() -> {
                if (method.equals("get")) {
                    graph.get("42", null, Map.of(), TOKEN);
                } else {
                    graph.post("42", null, Map.of(), TOKEN, false);
                }
            });
            assertThat(failure.code()).isEqualTo(Code.UNAVAILABLE);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    static String error(int code, int subcode, String message, boolean transientError) {
        return "{\"error\":{\"message\":\"" + message + "\",\"type\":\"OAuthException\",\"code\":" + code
                + (subcode > 0 ? ",\"error_subcode\":" + subcode : "") + ",\"is_transient\":" + transientError
                + ",\"fbtrace_id\":\"abc\"}}";
    }
}
