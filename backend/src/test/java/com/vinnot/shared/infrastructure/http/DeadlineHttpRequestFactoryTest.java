package com.vinnot.shared.infrastructure.http;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeadlineHttpRequestFactoryTest {
    private HttpServer server;
    private ExecutorService executor;
    private String base;
    private final AtomicInteger slowRequests = new AtomicInteger();
    private final AtomicInteger finishedStreams = new AtomicInteger();

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newVirtualThreadPerTaskExecutor();
        server.setExecutor(executor);
        server.createContext("/ok", exchange -> {
            byte[] body = "ok".getBytes(StandardCharsets.UTF_8);
            exchange.getRequestBody().readAllBytes();
            exchange.getResponseHeaders().set("X-Result", "accepted");
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.createContext("/redirect", exchange -> {
            exchange.getResponseHeaders().set("Location", base + "/ok");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.createContext("/unknown", exchange -> {
            exchange.sendResponseHeaders(599, -1);
            exchange.close();
        });
        server.createContext("/large", exchange -> {
            exchange.sendResponseHeaders(200, 2048);
            try (var output = exchange.getResponseBody()) { output.write(new byte[2048]); }
        });
        server.createContext("/drip", exchange -> {
            slowRequests.incrementAndGet();
            exchange.sendResponseHeaders(200, 0);
            try (var output = exchange.getResponseBody()) {
                for (int i = 0; i < 100; i++) {
                    output.write('x'); output.flush(); Thread.sleep(25);
                }
            } catch (IOException ignored) {
                // A cancelled client disconnects before the slow stream finishes.
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            } finally {
                finishedStreams.incrementAndGet();
                exchange.close();
            }
        });
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stop() {
        server.stop(0);
        executor.shutdownNow();
        executor.close();
    }

    private DeadlineHttpRequestFactory factory() {
        return new DeadlineHttpRequestFactory(Duration.ofSeconds(1), Duration.ofMillis(350), 16, 1024);
    }

    @Test
    void preservesHeadersBodyAndStatusWithoutFollowingRedirects() throws Exception {
        var factory = factory();
        var request = factory.createRequest(URI.create(base + "/ok"), HttpMethod.POST);
        assertThat(request.getURI()).isEqualTo(URI.create(base + "/ok"));
        assertThat(request.getMethod()).isEqualTo(HttpMethod.POST);
        request.getHeaders().setContentLength(2);
        request.getHeaders().set("Authorization", "Bearer test-only");
        request.getBody().write('a');
        request.getBody().write(new byte[]{'b'}, 0, 1);
        try (var response = request.execute()) {
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getStatusText()).isEqualTo("OK");
            assertThat(response.getHeaders().getFirst("X-Result")).isEqualTo("accepted");
            assertThat(new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8)).isEqualTo("ok");
        }
        try (var response = factory.createRequest(URI.create(base + "/redirect"), HttpMethod.GET).execute()) {
            assertThat(response.getStatusCode().value()).isEqualTo(302);
        }
        try (var response = factory.createRequest(URI.create(base + "/unknown"), HttpMethod.GET).execute()) {
            assertThat(response.getStatusText()).isEmpty();
        }
    }

    @Test
    void rejectsLargeBodiesBeforeSendingOrAllocatingUnboundedResponses() throws Exception {
        var factory = factory();
        var request = factory.createRequest(URI.create(base + "/ok"), HttpMethod.POST);
        assertThatThrownBy(() -> request.getBody().write(new byte[17])).isInstanceOf(IOException.class);
        request.getBody().write(new byte[16]);
        assertThatThrownBy(() -> request.getBody().write(1)).isInstanceOf(IOException.class);
        assertThatThrownBy(() -> factory.createRequest(URI.create(base + "/large"), HttpMethod.GET).execute())
                .isInstanceOf(IOException.class).hasMessage("External request failed");
        assertThatThrownBy(() -> new DeadlineHttpRequestFactory(Duration.ofSeconds(1), Duration.ofSeconds(1), 0, 1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DeadlineHttpRequestFactory(Duration.ofSeconds(1), Duration.ofSeconds(1), 1, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cancelsDrippingBodiesAndSharesOneBudgetAcrossCallsThenRecovers() throws Exception {
        var requestFactory = new DeadlineHttpRequestFactory(Duration.ofSeconds(1), Duration.ofSeconds(2), 16, 1024);
        var client = RestClient.builder().requestFactory(requestFactory).baseUrl(base).build();
        // Warm the HTTP client outside the deadline: CI startup is not part of the body cancellation contract.
        assertThat(client.get().uri("/ok").retrieve().body(String.class)).isEqualTo("ok");
        long started = System.nanoTime();
        try (var deadline = HttpOperationDeadline.start(Duration.ofSeconds(1))) {
            assertThat(client.get().uri("/ok").retrieve().body(String.class)).isEqualTo("ok");
            assertThatThrownBy(() -> client.get().uri("/drip").retrieve().body(String.class))
                    .isInstanceOf(ResourceAccessException.class);
            assertThatThrownBy(deadline::check).isInstanceOf(ResourceAccessException.class);
            assertThatThrownBy(() -> client.get().uri("/ok").retrieve().body(String.class))
                    .isInstanceOf(ResourceAccessException.class);
        }
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));
        assertThat(slowRequests.get()).isEqualTo(1);
        assertThat(client.get().uri("/ok").retrieve().body(String.class)).isEqualTo("ok");
        for (int i = 0; i < 100 && finishedStreams.get() == 0; i++) { Thread.sleep(10); }
        assertThat(finishedStreams.get()).isEqualTo(1);
    }

    @Test
    void interruptedRequestPreservesCancellationAndDoesNotLeakItsBudget() {
        var client = RestClient.builder().requestFactory(factory()).baseUrl(base).build();
        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(() -> client.get().uri("/drip").retrieve().body(String.class))
                    .isInstanceOf(ResourceAccessException.class);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
        assertThat(client.get().uri("/ok").retrieve().body(String.class)).isEqualTo("ok");
    }
}
