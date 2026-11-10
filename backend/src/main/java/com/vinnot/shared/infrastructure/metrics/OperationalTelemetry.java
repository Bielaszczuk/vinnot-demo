package com.vinnot.shared.infrastructure.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/** Infrastructure outcomes only: no prompts, identifiers, URLs or provider messages. */
@Component
public class OperationalTelemetry {
    private static final long SLOW_REQUEST_MILLIS = 5000;
    public enum AiOutcome {
        SUCCESS, TIMEOUT, RATE_LIMITED, QUOTA_EXHAUSTED, PROVIDER_FAILURE,
        INVALID_RESPONSE, CANCELLED, BUDGET_EXHAUSTED, PAUSED, CAPACITY_EXCEEDED, ADMISSION_FAILURE
    }

    private final MeterRegistry registry;

    public OperationalTelemetry(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordAi(AiOutcome outcome) {
        registry.counter("vinnot.ai.attempts", "outcome", outcome.name()).increment();
    }

    public void recordEmailFailure() {
        registry.counter("vinnot.email.failures").increment();
    }

    public void recordHttp(int status, long durationMillis) {
        registry.counter("vinnot.http.requests").increment();
        registry.counter("vinnot.http.seconds").increment(Math.max(0, durationMillis) / 1000.0);
        if (status >= 500) {
            registry.counter("vinnot.http.errors").increment();
        }
        if (durationMillis > SLOW_REQUEST_MILLIS) {
            registry.counter("vinnot.http.slow").increment();
        }
    }
}
