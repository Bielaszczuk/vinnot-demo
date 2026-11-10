package com.vinnot.shared.infrastructure.http;

import org.springframework.web.client.ResourceAccessException;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.Objects;

/** Thread-confined budget shared by sequential HTTP calls in a synchronous adapter. */
public final class HttpOperationDeadline implements AutoCloseable {
    private static final ThreadLocal<Long> CURRENT = new ThreadLocal<>();
    private static final Duration MAXIMUM_BUDGET = Duration.ofSeconds(60);
    private final Long previous;

    private HttpOperationDeadline(Duration budget) {
        requireBounded(budget);
        previous = CURRENT.get();
        long deadline = System.nanoTime() + budget.toNanos();
        CURRENT.set(Objects.isNull(previous) ? deadline : Math.min(previous, deadline));
    }

    public static HttpOperationDeadline start(Duration budget) {
        return new HttpOperationDeadline(budget);
    }

    public static Duration remaining(Duration requestBudget) {
        requireBounded(requestBudget);
        Long deadline = CURRENT.get();
        long nanos = Objects.isNull(deadline) ? requestBudget.toNanos()
                : Math.min(requestBudget.toNanos(), deadline - System.nanoTime());
        if (nanos <= 0) {
            throw new ResourceAccessException("External operation deadline exceeded",
                    new SocketTimeoutException("External operation deadline exceeded"));
        }
        return Duration.ofNanos(nanos);
    }

    public void check() {
        remaining(MAXIMUM_BUDGET);
    }

    public static void requireBounded(Duration budget) {
        if (budget.toMillis() < 1 || budget.compareTo(MAXIMUM_BUDGET) > 0) {
            throw new IllegalArgumentException("HTTP budgets must be between 1 ms and 60 s");
        }
    }

    @Override
    public void close() {
        if (Objects.isNull(previous)) {
            CURRENT.remove();
        } else {
            CURRENT.set(previous);
        }
    }
}
