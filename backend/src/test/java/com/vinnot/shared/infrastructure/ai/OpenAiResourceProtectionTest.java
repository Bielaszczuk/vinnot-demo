package com.vinnot.shared.infrastructure.ai;

import java.util.Objects;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiProviderAdmissionPort;
import org.junit.jupiter.api.AfterEach;
import org.slf4j.LoggerFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OpenAiResourceProtectionTest {
    private static final String SUCCESS = """
            {"service_tier":"default","model":"gpt-4o-mini",
             "usage":{"prompt_tokens":1000,"completion_tokens":100},
             "choices":[{"message":{"content":"{\\"result\\":\\"specific wine\\"}"}}]}
            """;
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
    void successfulTextRequestUsesStandardTierAndSettlesActualUsage() throws Exception {
        var body = new AtomicReference<String>();
        var client = client(exchange -> {
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, SUCCESS);
        }, Duration.ofSeconds(3), 2);
        assertThat(client.chatCompletion("Describe this wine", 0.2, 500))
                .containsEntry("result", "specific wine");
        assertThat(body.get()).contains("\"service_tier\":\"default\"", "json_object", "Describe this wine",
                "\"temperature\":0.2", "\"max_tokens\":500").doesNotContain("reasoning_effort", "max_completion_tokens");
        assertThat(calls.get()).isEqualTo(1);
        verify(admission).acquire("gpt-4o-mini", new BigDecimal("0.01950000"));
        verify(admission).complete(any(), eq(Optional.of(new BigDecimal("0.00021000"))));
    }

    @Test
    void reasoningModelsReceiveEffortCompletionLimitAndConfiguredTier() throws Exception {
        var body = new AtomicReference<String>();
        var client = client(exchange -> {
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, SUCCESS);
        }, Duration.ofSeconds(3), 2);
        ReflectionTestUtils.setField(client, "reasoningEffort", "none");
        ReflectionTestUtils.setField(client, "serviceTier", "priority");

        assertThat(client.chatCompletion("Describe this wine", 0.2, 500)).containsEntry("result", "specific wine");

        assertThat(body.get()).contains("\"reasoning_effort\":\"none\"", "\"max_completion_tokens\":500",
                "\"service_tier\":\"priority\"", "json_object")
                .doesNotContain("\"temperature\"", "\"max_tokens\"");
    }

    @ParameterizedTest
    @ValueSource(strings = {"insufficient_quota", "credit_balance_exhausted", "billing_hard_limit_reached",
            "organization_spend_limit_exceeded", "project_spend_limit_exceeded"})
    void billingFailuresAreNotRetriedAndKeepUnknownCostsReserved(String code) throws Exception {
        var client = client(exchange -> respond(exchange, 429,
                "{\"error\":{\"code\":\"" + code + "\",\"message\":\"private provider body\"}}"),
                Duration.ofSeconds(3), 3);
        assertThat(client.chatCompletion("p", 0, 500)).isEmpty();
        assertThat(calls.get()).isEqualTo(1);
        assertThat(metrics.get("vinnot.ai.attempts").tag("outcome", "QUOTA_EXHAUSTED").counter().count()).isEqualTo(1);
        verify(admission).complete(any(), eq(Optional.empty()));
    }

    @Test
    void rejectedAttemptsLogTheProviderStatusAndCodeWithoutTheBody() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(OpenAiClient.class);
        var logs = new ListAppender<ILoggingEvent>();
        logs.start();
        logger.addAppender(logs);
        try {
            var quota = client(exchange -> respond(exchange, 429,
                    "{\"error\":{\"code\":\"organization_spend_limit_exceeded\",\"message\":\"private provider body\"}}"),
                    Duration.ofSeconds(3), 1);
            assertThat(quota.chatCompletion("p", 0, 500)).isEmpty();
            server.stop(0);
            var unsafe = client(exchange -> respond(exchange, 500,
                    "{\"error\":{\"code\":\"<script>alert(1)</script>\"}}"), Duration.ofSeconds(3), 1);
            assertThat(unsafe.chatCompletion("p", 0, 500)).isEmpty();
        } finally {
            logger.detachAppender(logs);
            logs.stop();
        }
        assertThat(logs.list).extracting(ILoggingEvent::getFormattedMessage).containsExactly(
                "OpenAI text attempt 1/1 failed: HTTP 429 organization_spend_limit_exceeded",
                "OpenAI text attempt 1/1 failed: HTTP 500");
    }

    @Test
    void retryAfterIsAMinimumAndEveryAttemptReservesItsOwnBudget() throws Exception {
        var first = new AtomicReference<Long>();
        var client = client(exchange -> {
            if (calls.get() == 1) {
                first.set(System.nanoTime());
                exchange.getResponseHeaders().add("Retry-After", "1");
                respond(exchange, 429, "{\"error\":{\"code\":\"rate_limit_exceeded\"}}");
            } else {
                assertThat(Duration.ofNanos(System.nanoTime() - first.get())).isGreaterThanOrEqualTo(Duration.ofSeconds(1));
                respond(exchange, 200, SUCCESS);
            }
        }, Duration.ofSeconds(5), 3);
        assertThat(client.chatCompletion("p", 0, 500)).containsKey("result");
        assertThat(calls.get()).isEqualTo(2);
        verify(admission, times(2)).acquire(any(), any());
        verify(admission).complete(any(), eq(Optional.empty()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"30", "99999999999999999999999999999", "9223372036854775807"})
    void doesNotRetryEarlierThanLongOrOverflowedServerDelays(String delay) throws Exception {
        var client = client(exchange -> {
            exchange.getResponseHeaders().add("Retry-After", delay);
            respond(exchange, 503, "{}");
        }, Duration.ofSeconds(3), 3);
        assertThat(client.chatCompletion("p", 0, 500)).isEmpty();
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void handlesHttpDateRetryAfterAndCapsConfiguredAttemptsAtThree() throws Exception {
        var client = client(exchange -> {
            exchange.getResponseHeaders().add("Retry-After",
                    ZonedDateTime.now().minusSeconds(10).format(DateTimeFormatter.RFC_1123_DATE_TIME));
            respond(exchange, 500, "not-json");
        }, Duration.ofSeconds(5), 200);
        assertThat(client.chatCompletion("p", 0, 500)).isEmpty();
        assertThat(calls.get()).isEqualTo(3);
        verify(admission, times(3)).complete(any(), eq(Optional.empty()));
    }

    @ParameterizedTest
    @ValueSource(ints = {301, 400, 401, 403, 404, 422})
    void neverRedirectsCredentialsOrRetriesPermanentHttpFailures(int status) throws Exception {
        var client = client(exchange -> {
            exchange.getResponseHeaders().add("Location", "/redirect-target");
            respond(exchange, status, "{}");
        }, Duration.ofSeconds(3), 3);
        assertThat(client.chatCompletion("p", 0, 500)).isEmpty();
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void deadlineIncludesBodyDownloadAndDoesNotReplayAnAmbiguousTimeout() throws Exception {
        var started = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var client = client(exchange -> {
            exchange.sendResponseHeaders(200, 0);
            exchange.getResponseBody().write('{');
            exchange.getResponseBody().flush();
            started.countDown();
            try {
                release.await(3, TimeUnit.SECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        }, Duration.ofMillis(500), 3);
        long start = System.nanoTime();
        try {
            assertThat(client.chatCompletion("p", 0, 500)).isEmpty();
            assertThat(started.getCount()).isZero();
            assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(2));
            assertThat(calls.get()).isEqualTo(1);
            verify(admission).complete(any(), eq(Optional.empty()));
        } finally {
            release.countDown();
        }
    }

    @Test
    void interruptionCancelsActiveRequestAndRetainsUnknownBilling() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var client = client(exchange -> {
            entered.countDown();
            try {
                release.await(3, TimeUnit.SECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        }, Duration.ofSeconds(5), 3);
        var result = new AtomicReference<Map<String, Object>>();
        var interrupted = new AtomicReference<Boolean>();
        Thread worker = Thread.ofVirtual().start(() -> {
            result.set(client.chatCompletion("p", 0, 500));
            interrupted.set(Thread.currentThread().isInterrupted());
        });
        try {
            assertThat(entered.await(2, TimeUnit.SECONDS)).isTrue();
            worker.interrupt();
            worker.join(2000);
            assertThat(worker.isAlive()).isFalse();
            assertThat(result.get()).isEmpty();
            assertThat(interrupted.get()).isTrue();
            verify(admission).complete(any(), eq(Optional.empty()));
            assertThat(calls.get()).isEqualTo(1);
        } finally {
            release.countDown();
        }
    }

    @Test
    void admissionFailureNeverContactsProviderOrTurnsIntoNoMatch() throws Exception {
        var client = client(exchange -> respond(exchange, 200, SUCCESS), Duration.ofSeconds(3), 3);
        when(admission.acquire(any(), any())).thenThrow(new ExternalServiceUnavailableException(
                "AI_BUDGET_EXHAUSTED", "Budget reached", null));
        assertThatThrownBy(() -> client.chatCompletion("p", 0, 500))
                .isInstanceOf(ExternalServiceUnavailableException.class).extracting("code")
                .isEqualTo("AI_BUDGET_EXHAUSTED");
        assertThat(calls.get()).isZero();
        assertThat(metrics.get("vinnot.ai.attempts").tag("outcome", "BUDGET_EXHAUSTED").counter().count()).isEqualTo(1);
    }

    @Test
    void rejectsOversizedLocalRequestsBeforeSendingAndReleasesTheirFullReservation() throws Exception {
        var client = client(exchange -> respond(exchange, 200, SUCCESS), Duration.ofSeconds(5), 1);
        assertThat(client.chatCompletion("x".repeat(12 * 1024 * 1024), 0, 500)).isEmpty();
        assertThat(calls.get()).isZero();
        verify(admission).complete(any(), eq(Optional.of(BigDecimal.ZERO)));
    }

    @Test
    void limitsResponseBytesAndKeepsUnknownUsageReserved() throws Exception {
        var client = client(exchange -> respond(exchange, 200, "x".repeat(1024 * 1024 + 1)),
                Duration.ofSeconds(3), 3);
        assertThat(client.chatCompletion("p", 0, 500)).isEmpty();
        assertThat(calls.get()).isEqualTo(1);
        verify(admission).complete(any(), eq(Optional.empty()));
    }

    @Test
    void usageStillSettlesWhenTheAnswerIsInvalidAndOnlyContentFailuresCanRetry() throws Exception {
        var client = client(exchange -> respond(exchange, 200, calls.get() == 1
                        ? SUCCESS.replace("{\\\"result\\\":\\\"specific wine\\\"}", "{}") : SUCCESS),
                Duration.ofSeconds(3), 2);
        assertThat(client.chatCompletion("p", 0, 500)).containsEntry("result", "specific wine");
        assertThat(calls.get()).isEqualTo(2);
        verify(admission, times(2)).complete(any(), eq(Optional.of(new BigDecimal("0.00021000"))));
    }

    @Test
    void alreadyInterruptedCallerDoesNotAcquirePaidCapacity() throws Exception {
        var client = client(exchange -> respond(exchange, 200, SUCCESS), Duration.ofSeconds(3), 3);
        try {
            Thread.currentThread().interrupt();
            assertThat(client.chatCompletion("p", 0, 500)).isEmpty();
            verifyNoInteractions(admission);
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void validatesTransportDeadlineBounds() {
        assertThatThrownBy(() -> new OpenAiClient(new ObjectMapper(), "http://localhost", Duration.ZERO,
                Duration.ofSeconds(30), admission, OpenAiTestFixtures.pricing(), new OperationalTelemetry(metrics)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenAiClient(new ObjectMapper(), "http://localhost", Duration.ofSeconds(1),
                Duration.ofSeconds(61), admission, OpenAiTestFixtures.pricing(), new OperationalTelemetry(metrics)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private OpenAiClient client(HttpHandler handler, Duration timeout, int attempts) throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.setExecutor(executor);
        server.createContext("/completion", exchange -> {
            calls.incrementAndGet();
            handler.handle(exchange);
        });
        server.start();
        var client = new OpenAiClient(new ObjectMapper(), "http://localhost:" + server.getAddress().getPort()
                + "/completion", Duration.ofSeconds(1), timeout, admission, OpenAiTestFixtures.pricing(), new OperationalTelemetry(metrics));
        ReflectionTestUtils.setField(client, "model", "gpt-4o-mini");
        ReflectionTestUtils.setField(client, "apiKey", "test-not-a-real-key");
        ReflectionTestUtils.setField(client, "maxAttempts", attempts);
        ReflectionTestUtils.setField(client, "initialBackoffMs", 0);
        ReflectionTestUtils.setField(client, "serviceTier", "default");
        ReflectionTestUtils.setField(client, "reasoningEffort", "");
        return client;
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
        exchange.close();
    }
}
