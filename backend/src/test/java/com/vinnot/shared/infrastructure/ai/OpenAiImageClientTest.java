package com.vinnot.shared.infrastructure.ai;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.vinnot.shared.application.exception.AiImageGenerationException;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiImageService;
import com.vinnot.shared.application.port.AiProviderAdmissionPort;
import com.vinnot.shared.application.port.ImageEditRequest;
import com.vinnot.shared.application.port.ReferenceImage;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OpenAiImageClientTest {

    private static final String KEY = "test-not-a-real-key";
    private static final BigDecimal COST = new BigDecimal("0.25");
    private static final byte[] TRANSPARENT = ImageTransparencyTest.transparentWithSubject();
    private static final byte[] OPAQUE = ImageTransparencyTest.opaque();
    private final AiProviderAdmissionPort admission = OpenAiTestFixtures.admission();
    private final SimpleMeterRegistry metrics = new SimpleMeterRegistry();
    private final AtomicInteger calls = new AtomicInteger();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private HttpServer server;

    @AfterEach
    void close() {
        if (Objects.nonNull(server)) {
            server.stop(0);
        }
        executor.shutdownNow();
    }

    @Test
    void sendsOneMultipartEditWithEveryReferenceAndReturnsTheDecodedPng() throws Exception {
        var body = new AtomicReference<String>();
        var contentType = new AtomicReference<String>();
        var authorization = new AtomicReference<String>();
        AiImageService client = client(exchange -> {
            contentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            respond(exchange, 200, success(TRANSPARENT));
        }, properties(2, Duration.ofSeconds(5)));

        var image = client.edit(request(true, null));

        assertThat(image.png()).isEqualTo(TRANSPARENT);
        assertThat(image.model()).isEqualTo("gpt-image-1");
        assertThat(calls.get()).isEqualTo(1);
        assertThat(authorization.get()).startsWith("Bearer").endsWith(" " + KEY);
        assertThat(contentType.get()).startsWith("multipart/form-data; boundary=");
        String boundary = contentType.get().substring(contentType.get().indexOf('=') + 1);
        assertThat(body.get()).startsWith("--" + boundary + "\r\n").endsWith("--" + boundary + "--\r\n");
        assertThat(field(body.get(), "model")).isEqualTo("gpt-image-1");
        assertThat(field(body.get(), "prompt")).isEqualTo("Watercolor vineyard at dusk");
        assertThat(field(body.get(), "size")).isEqualTo("1024x1536");
        assertThat(field(body.get(), "quality")).isEqualTo("medium");
        assertThat(field(body.get(), "background")).isEqualTo("transparent");
        assertThat(field(body.get(), "output_format")).isEqualTo("png");
        assertThat(field(body.get(), "n")).isEqualTo("1");
        assertThat(body.get().split("name=\"image\\[]\"", -1)).hasSize(3);
        assertThat(body.get()).contains("name=\"image[]\"; filename=\"cellar.png\"\r\nContent-Type: image/png",
                "name=\"image[]\"; filename=\"vineyard.png\"\r\nContent-Type: image/png");
        verify(admission).acquire("gpt-image-1", COST);
        verify(admission).complete(any(), eq(Optional.of(COST)));
        assertThat(outcome("SUCCESS")).isEqualTo(1);
    }

    @Test
    void requestSizeOverridesTheDefaultAndOpaqueRequestsOmitTheBackground() throws Exception {
        var body = new AtomicReference<String>();
        var client = client(exchange -> {
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            respond(exchange, 200, success(OPAQUE));
        }, properties(2, Duration.ofSeconds(5)));

        assertThat(client.edit(request(false, "1024x1024")).png()).isEqualTo(OPAQUE);

        assertThat(field(body.get(), "size")).isEqualTo("1024x1024");
        assertThat(body.get()).doesNotContain("name=\"background\"");
    }

    @Test
    void opaqueResultForATransparentRequestIsRejectedWithoutRetryButSettled() throws Exception {
        var client = client(exchange -> respond(exchange, 200, success(OPAQUE)), properties(3, Duration.ofSeconds(5)));

        assertThatThrownBy(() -> client.edit(request(true, null)))
                .isInstanceOfSatisfying(AiImageGenerationException.class,
                        failure -> assertThat(failure.getCode()).isEqualTo(AiImageGenerationException.REJECTED));
        assertThat(calls.get()).isEqualTo(1);
        verify(admission).complete(any(), eq(Optional.of(COST)));
        assertThat(outcome("INVALID_RESPONSE")).isEqualTo(1);
    }

    @Test
    void rateLimitIsRetriedWithItsOwnPermit() throws Exception {
        var client = client(exchange -> {
            if (calls.get() == 1) {
                respond(exchange, 429, "{\"error\":{\"code\":\"rate_limit_exceeded\"}}");
            } else {
                respond(exchange, 200, success(TRANSPARENT));
            }
        }, properties(2, Duration.ofSeconds(5)));

        assertThat(client.edit(request(true, null)).png()).isEqualTo(TRANSPARENT);
        assertThat(calls.get()).isEqualTo(2);
        verify(admission, times(2)).acquire("gpt-image-1", COST);
        verify(admission).complete(any(), eq(Optional.empty()));
        verify(admission).complete(any(), eq(Optional.of(COST)));
    }

    @Test
    void serverErrorsAreRetriedUpToTheConfiguredAttempts() throws Exception {
        var client = client(exchange -> respond(exchange, 503, "{}"), properties(2, Duration.ofSeconds(5)));

        assertFailed(client);
        assertThat(calls.get()).isEqualTo(2);
        verify(admission, times(2)).complete(any(), eq(Optional.empty()));
    }

    @Test
    void clientErrorsAndBillingFailuresAreNotRetried() throws Exception {
        var client = client(exchange -> respond(exchange, calls.get() == 1 ? 400 : 429,
                calls.get() == 1 ? "{\"error\":{\"code\":\"invalid_value\"}}"
                        : "{\"error\":{\"code\":\"insufficient_quota\"}}"), properties(3, Duration.ofSeconds(5)));

        assertFailed(client);
        assertThat(calls.get()).isEqualTo(1);
        assertFailed(client);
        assertThat(calls.get()).isEqualTo(2);
        verify(admission, times(2)).complete(any(), eq(Optional.empty()));
        assertThat(outcome("QUOTA_EXHAUSTED")).isEqualTo(1);
    }

    @Test
    void redirectsAreNotFollowed() throws Exception {
        var client = client(exchange -> {
            exchange.getResponseHeaders().add("Location", "http://example.invalid/");
            respond(exchange, 302, "");
        }, properties(3, Duration.ofSeconds(5)));

        assertFailed(client);
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void transportTimeoutsAreNeverReplayed() throws Exception {
        var client = client(exchange -> {
            try {
                Thread.sleep(3_000);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
            respond(exchange, 200, success(TRANSPARENT));
        }, properties(3, Duration.ofMillis(1_500)));

        assertFailed(client);
        assertThat(calls.get()).isEqualTo(1);
        verify(admission).complete(any(), eq(Optional.empty()));
        assertThat(outcome("TIMEOUT")).isEqualTo(1);
    }

    @Test
    void droppedConnectionsAreNeverReplayedBecauseTheCallMayHaveBeenBilled() throws Exception {
        var client = client(HttpExchange::close, properties(3, Duration.ofSeconds(5)));

        assertFailed(client);
        assertThat(calls.get()).isEqualTo(1);
        verify(admission).complete(any(), eq(Optional.empty()));
    }

    @Test
    void oversizedResponsesAreRejected() throws Exception {
        var client = client(exchange -> respond(exchange, 200,
                "x".repeat(OpenAiImageClient.MAX_RESPONSE_BYTES + 1)), properties(3, Duration.ofSeconds(10)));

        assertFailed(client);
        assertThat(calls.get()).isEqualTo(1);
        verify(admission).complete(any(), eq(Optional.empty()));
    }

    @Test
    void malformedBodiesFailWithoutRetryAndSettleTheBilledCall() throws Exception {
        var client = client(exchange -> respond(exchange, 200, calls.get() == 1 ? "{\"data\":[]}"
                : "{\"data\":[{\"b64_json\":\"%%%not-base64\"}]}"), properties(3, Duration.ofSeconds(5)));

        assertFailed(client);
        assertFailed(client);
        assertThat(calls.get()).isEqualTo(2);
        verify(admission, times(2)).complete(any(), eq(Optional.of(COST)));
    }

    @Test
    void admissionRefusalIsUnavailableAndNeverCallsTheProvider() throws Exception {
        when(admission.acquire(anyString(), any())).thenThrow(
                new ExternalServiceUnavailableException("AI_BUDGET_EXHAUSTED", "budget", null));
        var client = client(exchange -> respond(exchange, 200, success(TRANSPARENT)),
                properties(3, Duration.ofSeconds(5)));

        assertThatThrownBy(() -> client.edit(request(true, null)))
                .isInstanceOfSatisfying(AiImageGenerationException.class, failure -> {
                    assertThat(failure.getCode()).isEqualTo(AiImageGenerationException.UNAVAILABLE);
                    assertThat(((ExternalServiceUnavailableException) failure.getCause()).getCode())
                            .isEqualTo("AI_BUDGET_EXHAUSTED");
                });
        assertThat(calls.get()).isZero();
        verify(admission, times(1)).acquire(anyString(), any());
        assertThat(outcome("BUDGET_EXHAUSTED")).isEqualTo(1);
    }

    @Test
    void disabledMockOrKeylessConfigurationsAreUnavailableWithoutAnyCall() throws Exception {
        start(exchange -> respond(exchange, 200, success(TRANSPARENT)));
        var disabled = new OpenAiImageProperties(false, null, null, null, null, null, null, null);
        List<OpenAiImageClient> clients = List.of(
                client(disabled, KEY, true, "openai"),
                client(properties(1, Duration.ofSeconds(5)), KEY, true, "mock"),
                client(properties(1, Duration.ofSeconds(5)), " ", true, "openai"),
                client(properties(1, Duration.ofSeconds(5)), KEY, false, "openai"));

        for (var client : clients) {
            assertThat(client.isAvailable()).isFalse();
            assertThatThrownBy(() -> client.edit(request(true, null)))
                    .isInstanceOfSatisfying(AiImageGenerationException.class, failure ->
                            assertThat(failure.getCode()).isEqualTo(AiImageGenerationException.UNAVAILABLE));
        }
        assertThat(clients.get(1).isMockMode()).isTrue();
        assertThat(clients.get(0).isMockMode()).isFalse();
        assertThat(calls.get()).isZero();
        verifyNoInteractions(admission);
    }

    @Test
    void propertiesDefaultSafelyAndRejectUnboundedValues() {
        var defaults = new OpenAiImageProperties(null, null, null, null, null, null, null, null);
        assertThat(defaults.enabled()).isFalse();
        assertThat(defaults.model()).isEqualTo("gpt-image-1");
        assertThat(defaults.quality()).isEqualTo("medium");
        assertThat(defaults.size()).isEqualTo("1024x1536");
        assertThat(defaults.maxCostUsd()).isEqualByComparingTo("0.25");
        assertThat(defaults.timeout()).isLessThan(Duration.ofMinutes(2));
        assertThatThrownBy(() -> new OpenAiImageProperties(true, null, null, null, null,
                Duration.ofSeconds(120), null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenAiImageProperties(true, null, null, null, BigDecimal.ZERO,
                null, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenAiImageProperties(true, null, "ultra", null, null,
                null, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenAiImageProperties(true, null, null, "1080x1350", null,
                null, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenAiImageProperties(true, null, null, null, null,
                null, 4, null)).isInstanceOf(IllegalArgumentException.class);
    }

    private void assertFailed(AiImageService client) {
        assertThatThrownBy(() -> client.edit(request(true, null)))
                .isInstanceOfSatisfying(AiImageGenerationException.class,
                        failure -> assertThat(failure.getCode()).isEqualTo(AiImageGenerationException.FAILED));
    }

    private static ImageEditRequest request(boolean transparent, String size) {
        return new ImageEditRequest("Watercolor vineyard at dusk", List.of(
                new ReferenceImage("cellar.png", TRANSPARENT), new ReferenceImage("vineyard.png", TRANSPARENT)),
                size, transparent);
    }

    private static OpenAiImageProperties properties(int attempts, Duration timeout) {
        return new OpenAiImageProperties(true, "gpt-image-1", "medium", "1024x1536", COST, timeout, attempts, 0L);
    }

    private static String success(byte[] png) {
        return "{\"created\":1,\"data\":[{\"b64_json\":\"" + Base64.getEncoder().encodeToString(png) + "\"}]}";
    }

    private static String field(String body, String name) {
        String marker = "name=\"" + name + "\"\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n";
        int start = body.indexOf(marker);
        assertThat(start).as("multipart field %s", name).isNotNegative();
        int valueStart = start + marker.length();
        return body.substring(valueStart, body.indexOf("\r\n", valueStart));
    }

    private double outcome(String outcome) {
        var counter = metrics.find("vinnot.ai.attempts").tag("outcome", outcome).counter();
        return Objects.isNull(counter) ? 0 : counter.count();
    }

    private OpenAiImageClient client(HttpHandler handler, OpenAiImageProperties properties) throws IOException {
        start(handler);
        return client(properties, KEY, true, "openai");
    }

    private OpenAiImageClient client(OpenAiImageProperties properties, String key, boolean aiEnabled,
            String provider) {
        return new OpenAiImageClient(new ObjectMapper(), properties, admission, new OperationalTelemetry(metrics),
                "http://localhost:" + server.getAddress().getPort() + "/images/edits", Duration.ofSeconds(1), key,
                aiEnabled, provider);
    }

    private void start(HttpHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.setExecutor(executor);
        server.createContext("/images/edits", exchange -> {
            calls.incrementAndGet();
            handler.handle(exchange);
        });
        server.start();
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
        if (bytes.length > 0) {
            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        }
        exchange.close();
    }
}
