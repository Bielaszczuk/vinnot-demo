package com.vinnot.shared.infrastructure.ai;

import java.util.Objects;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import com.vinnot.shared.application.port.AiImageCompletionRequest;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiClientContractTest {

    private static final Duration SHORT_REQUEST_TIMEOUT = Duration.ofMillis(100);
    private static final long SLOW_PROVIDER_DELAY_MS = 500L;
    private static final long MAX_EXPECTED_TIMEOUT_ELAPSED_MS = 1_000L;

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (Objects.nonNull(server)) {
            server.stop(0);
        }
    }

    @Test
    void sendsVisionSchemaAndParsesTheProviderContract() throws IOException {
        AtomicReference<String> requestBody = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            requestBody.set(new String(
                    exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] response = ("{\"choices\":[{\"message\":{\"content\":"
                    + "\"{\\\"wineName\\\":\\\"Malbec Reserva\\\"}\"}}]}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        OpenAiClient client = new OpenAiClient(
                new ObjectMapper(), "http://localhost:" + server.getAddress().getPort()
                        + "/v1/chat/completions", Duration.ofSeconds(10), Duration.ofSeconds(30),
                OpenAiTestFixtures.admission(), OpenAiTestFixtures.pricing(), new OperationalTelemetry(new SimpleMeterRegistry()));
        ReflectionTestUtils.setField(client, "apiKey", "contract-key");
        ReflectionTestUtils.setField(client, "visionModel", "vision-contract-model");
        ReflectionTestUtils.setField(client, "maxAttempts", 1);

        Map<String, Object> result = client.structuredCompletionWithImage(
                new AiImageCompletionRequest(
                        "Read the label",
                        new byte[] {1, 2, 3},
                        "image/jpeg",
                        0.0,
                        500,
                        "wine_label",
                        Map.of("type", "object"),
                        AiImageCompletionRequest.ImageDetail.LOW,
                        Duration.ofSeconds(2),
                        1));

        assertThat(result).containsEntry("wineName", "Malbec Reserva");
        assertThat(authorization.get()).isEqualTo("Bearer contract-key");
        assertThat(requestBody.get())
                .contains("vision-contract-model")
                .contains("json_schema")
                .contains("\"detail\":\"low\"")
                .contains("data:image/jpeg;base64,AQID");
    }

    @Test
    void reportsAvailabilityOnlyForAnEnabledConfiguredOpenAiProvider() {
        OpenAiClient client = new OpenAiClient(
                new ObjectMapper(), "http://localhost:1/v1/chat/completions",
                Duration.ofSeconds(10), Duration.ofSeconds(30),
                OpenAiTestFixtures.admission(), OpenAiTestFixtures.pricing(), new OperationalTelemetry(new SimpleMeterRegistry()));

        ReflectionTestUtils.setField(client, "aiEnabled", true);
        ReflectionTestUtils.setField(client, "aiProvider", "openai");
        ReflectionTestUtils.setField(client, "apiKey", "contract-key");
        assertThat(client.isAvailable()).isTrue();

        ReflectionTestUtils.setField(client, "apiKey", " ");
        assertThat(client.isAvailable()).isFalse();
        ReflectionTestUtils.setField(client, "apiKey", "contract-key");
        ReflectionTestUtils.setField(client, "aiProvider", "mock");
        assertThat(client.isAvailable()).isFalse();
        ReflectionTestUtils.setField(client, "aiProvider", "openai");
        ReflectionTestUtils.setField(client, "aiEnabled", false);
        assertThat(client.isAvailable()).isFalse();
    }

    @Test
    void enforcesAnOverallVisionDeadlineAndDiscardsTheLateProviderResponse()
            throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            try {
                Thread.sleep(SLOW_PROVIDER_DELAY_MS);
                exchange.sendResponseHeaders(200, 0);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();
        OpenAiClient client = new OpenAiClient(
                new ObjectMapper(), "http://localhost:" + server.getAddress().getPort()
                        + "/v1/chat/completions", Duration.ofSeconds(10), Duration.ofSeconds(30),
                OpenAiTestFixtures.admission(), OpenAiTestFixtures.pricing(), new OperationalTelemetry(new SimpleMeterRegistry()));
        ReflectionTestUtils.setField(client, "apiKey", "contract-key");
        ReflectionTestUtils.setField(client, "visionModel", "vision-contract-model");
        ReflectionTestUtils.setField(client, "maxAttempts", 1);

        long startedAt = System.nanoTime();
        Map<String, Object> result = client.structuredCompletionWithImage(
                new AiImageCompletionRequest(
                        "Read the label", new byte[] {1}, "image/jpeg",
                        0.0, 100, "wine_label", Map.of("type", "object"),
                        AiImageCompletionRequest.ImageDetail.LOW,
                        SHORT_REQUEST_TIMEOUT, 1));
        long elapsedMs = Duration.ofNanos(
                System.nanoTime() - startedAt).toMillis();

        assertThat(result).isEmpty();
        assertThat(elapsedMs).isLessThan(MAX_EXPECTED_TIMEOUT_ELAPSED_MS);
    }
}
