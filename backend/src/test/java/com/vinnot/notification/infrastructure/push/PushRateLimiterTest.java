package com.vinnot.notification.infrastructure.push;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PushRateLimiterTest {
    private final List<Duration> pauses = new ArrayList<>();
    private final AtomicLong nanos = new AtomicLong();

    @Test
    void aFullBucketLetsOneSecondOfMessagesThroughThenEachCallerWaitsForItsShare() {
        var limiter = new PushRateLimiter(500, nanos::get, pauses::add);

        for (int batch = 0; batch < 5; batch++) {
            limiter.acquire(100);
        }
        assertThat(pauses).isEmpty();
        limiter.acquire(100);
        limiter.acquire(100);

        assertThat(pauses).containsExactly(Duration.ofMillis(200), Duration.ofMillis(400));
    }

    @Test
    void tokensRefillWithTimeButNeverAboveOneSecondOfBurst() {
        var limiter = new PushRateLimiter(500, nanos::get, pauses::add);
        limiter.acquire(500);
        nanos.addAndGet(TimeUnit.SECONDS.toNanos(10));

        limiter.acquire(500);
        limiter.acquire(50);

        assertThat(pauses).containsExactly(Duration.ofMillis(100));
    }

    @Test
    void anUnlimitedLimiterNeverWaitsAndTheRateMustBePositive() {
        var limiter = PushRateLimiter.unlimited();
        limiter.acquire(1_000_000);
        assertThatThrownBy(() -> new PushRateLimiter(0, nanos::get, pauses::add)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void concurrentCallersShareOneBucket() throws InterruptedException {
        List<Duration> waits = Collections.synchronizedList(new ArrayList<>());
        var limiter = new PushRateLimiter(100, nanos::get, waits::add);
        var done = new CountDownLatch(20);
        try (var threads = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int caller = 0; caller < 20; caller++) {
                threads.execute(() -> {
                    limiter.acquire(10);
                    done.countDown();
                });
            }
            assertThat(done.await(5, TimeUnit.SECONDS)).isTrue();
        }
        // 200 permits against 100 in the bucket: the 10 callers past the burst wait 0.1 s, 0.2 s ... 1 s.
        assertThat(waits).hasSize(10);
        assertThat(waits.stream().mapToLong(Duration::toMillis).sorted().toArray())
                .containsExactly(100, 200, 300, 400, 500, 600, 700, 800, 900, 1000);
    }
}
