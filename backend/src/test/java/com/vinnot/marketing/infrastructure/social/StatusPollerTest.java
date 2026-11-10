package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.infrastructure.social.SocialTestSupport.ManualClock;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.failure;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.poller;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StatusPollerTest {

    private final ManualClock clock = new ManualClock();

    @Test
    void returnsAtOnceWhenTheFirstCheckIsDone() {
        var result = poller(clock, Duration.ofSeconds(15), Duration.ofMinutes(5)).await(() -> Optional.of("ok"), "x");

        assertThat(result).isEqualTo("ok");
        assertThat(clock.sleeps()).isZero();
    }

    @Test
    void sleepsTheIntervalBetweenChecks() {
        var checks = new AtomicInteger();

        var result = poller(clock, Duration.ofSeconds(15), Duration.ofMinutes(5))
                .await(() -> checks.incrementAndGet() < 3 ? Optional.empty() : Optional.of(checks.get()), "x");

        assertThat(result).isEqualTo(3);
        assertThat(clock.sleeps()).isEqualTo(2);
        assertThat(clock.instant()).isEqualTo(SocialTestSupport.NOW.plusSeconds(30));
    }

    @Test
    void timesOutAfterAFinalCheckAtTheDeadline() {
        var checks = new AtomicInteger();

        var failure = failure(() -> poller(clock, Duration.ofSeconds(40), Duration.ofSeconds(100)).await(() -> {
            checks.incrementAndGet();
            return Optional.empty();
        }, "container"));

        assertThat(failure.code()).isEqualTo(Code.PROCESSING_TIMEOUT);
        assertThat(failure.detail()).contains("container");
        assertThat(checks.get()).isEqualTo(4);
        assertThat(clock.instant()).isEqualTo(SocialTestSupport.NOW.plusSeconds(100));
    }

    @Test
    void anInterruptedWaitIsUnavailableAndKeepsTheInterrupt() {
        var poller = new StatusPoller(clock, duration -> {
            throw new InterruptedException();
        }, Duration.ofSeconds(1), Duration.ofSeconds(10));
        try {
            var failure = failure(() -> poller.await(Optional::empty, "x"));
            assertThat(failure.code()).isEqualTo(Code.UNAVAILABLE);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void rejectsAnIntervalLongerThanTheTimeout() {
        assertThatThrownBy(() -> new StatusPoller(clock, clock::advance, Duration.ofMinutes(10), Duration.ofMinutes(5)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new StatusPoller(clock, clock::advance, Duration.ZERO, Duration.ofMinutes(5)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
