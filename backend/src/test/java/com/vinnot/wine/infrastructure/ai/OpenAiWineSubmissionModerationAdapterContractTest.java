package com.vinnot.wine.infrastructure.ai;

import java.util.Objects;
import tools.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.vinnot.wine.domain.model.WineContentSafetyReview;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.shared.infrastructure.http.HttpOperationDeadline;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.Semaphore;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiWineSubmissionModerationAdapterContractTest {

    private HttpServer server;

    @Test
    void slowBodyTimesOutWithoutApprovingOrLeakingReviewCapacityAndRecovers() throws Exception {
        var requests = new AtomicInteger();
        var payload = new AtomicReference<>("drip");
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(executor);
            server.createContext("/moderate", exchange -> {
                requests.incrementAndGet();
                exchange.getRequestBody().readAllBytes();
                exchange.sendResponseHeaders(200, 0);
                try (var body = exchange.getResponseBody()) {
                    if (payload.get().equals("drip")) {
                        for (int i = 0; i < 50; i++) {
                            body.write(' '); body.flush(); Thread.sleep(20);
                        }
                    } else {
                        body.write(payload.get().getBytes(StandardCharsets.UTF_8));
                    }
                } catch (IOException ignored) {
                    // Expected disconnect after client-side cancellation.
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                } finally {
                    exchange.close();
                }
            });
            server.start();
            var adapter = new OpenAiWineSubmissionModerationAdapter(new ObjectMapper(),
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/moderate", "test-only", "test-model");
            var submission = WineSubmission.create(UUID.randomUUID(), "Wine", "Winery", "RED", 2022,
                    List.of("Malbec"), "Argentina", "Mendoza", BigDecimal.TEN, "notes");
            long started = System.nanoTime();
            try (var deadline = HttpOperationDeadline.start(Duration.ofMillis(350))) {
                var result = adapter.reviewSafety(submission, new byte[]{1}, "image/jpeg");
                assertThat(result.completed()).isFalse();
                assertThat(result.safe()).isFalse();
            }
            assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));
            assertThat(requests.get()).isEqualTo(1);
            for (String malformed : List.of("{}", "{\"results\":[]}", "{\"results\":[{}]}",
                    "{\"results\":[{\"flagged\":\"not-a-boolean\"}]}", "not-json")) {
                payload.set(malformed);
                var result = adapter.reviewSafety(submission, new byte[]{1}, "image/jpeg");
                assertThat(result.completed()).as(malformed).isFalse();
                assertThat(result.safe()).isFalse();
            }
            payload.set("{\"results\":[{\"flagged\":false}]}");
            var recovered = adapter.reviewSafety(submission, new byte[]{1}, "image/jpeg");
            assertThat(recovered.completed()).isTrue();
            assertThat(recovered.safe()).isTrue();
            assertThat(((Semaphore) ReflectionTestUtils.getField(adapter, "reviewSlots")).availablePermits()).isEqualTo(2);
            server.stop(0);
            executor.shutdownNow();
        }
    }

    @Test
    void saturationDoesNotEncodeAnImageOrApproveContentAndCapacityRecovers() {
        var adapter = new OpenAiWineSubmissionModerationAdapter(new ObjectMapper(),
                "http://localhost:1/moderations", "", "omni-moderation-latest");
        var slots = (Semaphore) ReflectionTestUtils.getField(adapter, "reviewSlots");
        assertThat(slots).isNotNull();
        assertThat(slots.tryAcquire(2)).isTrue();
        try {
            var saturated = adapter.reviewSafety(null, null, null);
            assertThat(saturated.completed()).isFalse();
            assertThat(saturated.safe()).isFalse();
            assertThat(slots.availablePermits()).isZero();
        } finally {
            slots.release(2);
        }
        assertThat(adapter.reviewSafety(null, null, null).completed()).isFalse();
        assertThat(slots.availablePermits()).isEqualTo(2);
    }

    @AfterEach
    void tearDown() {
        if (Objects.nonNull(server)) {
            server.stop(0);
        }
    }

    @Test
    void moderatesTheCompleteFormAndImageThroughTheProviderContract()
            throws IOException {
        AtomicReference<String> requestBody = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/moderations", exchange -> {
            requestBody.set(new String(
                    exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] response = "{\"results\":[{\"flagged\":true}]}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        String url = "http://localhost:" + server.getAddress().getPort()
                + "/v1/moderations";
        OpenAiWineSubmissionModerationAdapter adapter =
                new OpenAiWineSubmissionModerationAdapter(
                        new ObjectMapper(), url, "contract-key", "moderation-contract-model");
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(),
                "Label Name",
                "Winery Name",
                "RED",
                2022,
                List.of("Malbec", "Cabernet Sauvignon"),
                "Argentina",
                "Mendoza",
                new BigDecimal("14.5"),
                "User notes");

        WineContentSafetyReview review = adapter.reviewSafety(
                submission, new byte[] {1, 2, 3}, "image/jpeg");

        assertThat(review.completed()).isTrue();
        assertThat(review.safe()).isFalse();
        assertThat(authorization.get()).isEqualTo("Bearer contract-key");
        assertThat(requestBody.get())
                .contains("moderation-contract-model")
                .contains("Label Name")
                .contains("Winery Name")
                .contains("RED")
                .contains("2022")
                .contains("Malbec")
                .contains("Cabernet Sauvignon")
                .contains("Argentina")
                .contains("Mendoza")
                .contains("14.5")
                .contains("User notes")
                .contains("data:image/jpeg;base64,AQID");
    }
}
