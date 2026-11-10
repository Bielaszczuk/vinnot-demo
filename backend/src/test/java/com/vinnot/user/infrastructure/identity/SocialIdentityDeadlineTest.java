package com.vinnot.user.infrastructure.identity;

import tools.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.infrastructure.http.HttpOperationDeadline;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.infrastructure.config.SocialHttpConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.web.util.DefaultUriBuilderFactory;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialIdentityDeadlineTest {
    @Test
    void facebookVerificationAndProfileShareDeadlineWithoutBreakingTheNextLogin() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var slow = new AtomicBoolean(true);
        var profiles = new AtomicInteger();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            server.setExecutor(executor);
            server.createContext("/v23.0/debug_token", exchange -> {
                byte[] data = "{\"data\":{\"is_valid\":true,\"app_id\":\"app\",\"user_id\":\"user\"}}"
                        .getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, data.length);
                try (var body = exchange.getResponseBody()) { body.write(data); }
            });
            server.createContext("/v23.0/me", exchange -> {
                profiles.incrementAndGet();
                exchange.sendResponseHeaders(200, 0);
                try (var body = exchange.getResponseBody()) {
                    if (slow.get()) {
                        for (int i = 0; i < 50; i++) { body.write(' '); body.flush(); Thread.sleep(25); }
                    }
                    body.write("{\"id\":\"user\",\"email\":\"test@example.invalid\"}".getBytes(StandardCharsets.UTF_8));
                } catch (IOException ignored) {
                    // Client cancelled the incomplete body.
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                } finally { exchange.close(); }
            });
            server.start();
            var config = new SocialHttpConfiguration(Duration.ofSeconds(1), Duration.ofSeconds(2));
            var builder = config.socialRestClientBuilder().uriBuilderFactory(
                    new DefaultUriBuilderFactory("http://127.0.0.1:" + server.getAddress().getPort()));
            var adapter = new SocialIdentityVerifierAdapter(new ObjectMapper(), builder,
                    config.socialJwkRestOperations(), "", "", "app", "secret", "v23.0");
            var credential = new SocialCredential(SocialProvider.FACEBOOK, "test-token", null, null, null);
            try (var deadline = HttpOperationDeadline.start(Duration.ofMillis(350))) {
                assertThatThrownBy(() -> adapter.verify(credential)).isInstanceOf(BusinessRuleViolationException.class);
            }
            assertThat(profiles.get()).isEqualTo(1);
            slow.set(false);
            assertThat(adapter.verify(credential).subject()).isEqualTo("user");
            assertThat(profiles.get()).isEqualTo(2);
            server.stop(0);
            executor.shutdownNow();
        } finally { server.stop(0); }
    }
}
