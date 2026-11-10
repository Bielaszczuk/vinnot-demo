package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.assertj.core.api.ThrowableAssert;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** Shared fakes for the network adapter tests: a clock the poller's sleeps advance, tokens and requests. */
final class SocialTestSupport {

    static final String TOKEN = "test-token-not-real-0123456789";
    static final Instant NOW = Instant.parse("2026-11-04T19:00:00Z");
    static final List<String> IMAGES = List.of("https://media.example.test/a.jpg", "https://media.example.test/b.jpg");

    private SocialTestSupport() {
    }

    /** A clock that only moves when the poller sleeps. */
    static final class ManualClock extends Clock {
        private Instant now = NOW;
        private final AtomicInteger sleeps = new AtomicInteger();

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public synchronized Instant instant() {
            return now;
        }

        synchronized void advance(Duration duration) {
            sleeps.incrementAndGet();
            now = now.plus(duration);
        }

        int sleeps() {
            return sleeps.get();
        }
    }

    static SocialHttpTransport transport() {
        return transport(Duration.ofSeconds(5));
    }

    static SocialHttpTransport transport(Duration requestTimeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        return new SocialHttpTransport(client, new ObjectMapper(), requestTimeout);
    }

    static StatusPoller poller(ManualClock clock, Duration interval, Duration timeout) {
        return new StatusPoller(clock, clock::advance, interval, timeout);
    }

    static SocialAccountTokens tokens(SocialNetwork network, String accountId) {
        return tokens(Map.of(network, new SocialAccessToken(TOKEN, accountId, null)));
    }

    static SocialAccountTokens tokens(Map<SocialNetwork, SocialAccessToken> tokens) {
        return network -> Optional.ofNullable(tokens.get(network));
    }

    static SocialAccountTokens none() {
        return network -> Optional.empty();
    }

    static PublishRequest request(SocialNetwork network, List<String> images, NetworkCaption caption) {
        return new PublishRequest(UUID.fromString("00000000-0000-0000-0000-000000000510"), network, images,
                "Slides about Malbec", caption);
    }

    static SocialPublishingException failure(ThrowableAssert.ThrowingCallable call) {
        SocialPublishingException failure = catchThrowableOfType(SocialPublishingException.class, call);
        assertThat(failure).as("expected a SocialPublishingException").isNotNull();
        assertThat(failure.getMessage()).doesNotContain(TOKEN);
        assertThat(String.valueOf(failure.detail())).doesNotContain(TOKEN);
        return failure;
    }
}
