package com.vinnot.user.infrastructure.config;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialHttpConfigurationTest {

    @Test
    void rejectsUnlimitedNegativeAndOverflowingTimeouts() {
        for (Duration invalid : new Duration[]{Duration.ZERO, Duration.ofMillis(-1),
                Duration.ofNanos(1), Duration.ofMillis((long) Integer.MAX_VALUE + 1)}) {
            assertThatThrownBy(() -> new SocialHttpConfiguration(invalid, Duration.ofSeconds(1)))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new SocialHttpConfiguration(Duration.ofSeconds(1), invalid))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void slowProviderTimesOutAndTransportRecoversWithoutRetries() throws Exception {
        CountDownLatch unblock = new CountDownLatch(1);
        var executor = Executors.newVirtualThreadPerTaskExecutor();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(executor);
        server.createContext("/slow", exchange -> {
            try {
                unblock.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.createContext("/ok", exchange -> {
            byte[] response = "ok".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, response.length);
            try (var body = exchange.getResponseBody()) {
                body.write(response);
            }
        });
        server.start();
        try {
            String base = "http://127.0.0.1:" + server.getAddress().getPort();
            var configuration = new SocialHttpConfiguration(
                    Duration.ofMillis(200), Duration.ofMillis(200));
            var client = configuration.socialRestClientBuilder().baseUrl(base).build();
            var keys = configuration.socialJwkRestOperations();
            long started = System.nanoTime();
            assertThatThrownBy(() -> client.get().uri("/slow").retrieve().body(String.class))
                    .isInstanceOf(ResourceAccessException.class);
            assertThatThrownBy(() -> keys.getForObject(base + "/slow", String.class))
                    .isInstanceOf(ResourceAccessException.class);
            assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(4));
            assertThat(client.get().uri("/ok").retrieve().body(String.class)).isEqualTo("ok");
            assertThat(keys.getForObject(base + "/ok", String.class)).isEqualTo("ok");
        } finally {
            unblock.countDown();
            server.stop(0);
            executor.close();
        }
    }
}
