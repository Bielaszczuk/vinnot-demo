package com.vinnot.ai.application.service;

import com.vinnot.ai.application.config.AiGenerationPolicy;
import com.vinnot.ai.application.port.out.AiGenerationLeasePort;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.concurrent.locks.LockSupport;

/**
 * Provides distributed single-flight semantics for expensive AI operations.
 * Database work remains in repository transactions; the provider call does not
 * hold an application transaction open.
 */
@Service
public class AiGenerationCoordinator {

    private final AiGenerationLeasePort leasePort;
    private final Duration leaseDuration;
    private final Duration waitTimeout;
    private final Duration pollInterval;

    public AiGenerationCoordinator(
            AiGenerationLeasePort leasePort,
            AiGenerationPolicy policy) {
        this.leasePort = leasePort;
        this.leaseDuration = policy.leaseDuration();
        this.waitTimeout = policy.waitTimeout();
        this.pollInterval = policy.pollInterval();
    }

    public <T> T execute(
            String key,
            Supplier<Optional<T>> completedResult,
            Supplier<T> generation) {
        Optional<T> completed = completedResult.get();
        if (completed.isPresent()) {
            return completed.get();
        }
        return acquireAndExecute(key, completedResult, generation, true);
    }

    public <T> T executeExclusively(String key, Supplier<T> generation) {
        return acquireAndExecute(key, Optional::empty, generation, false);
    }

    private <T> T acquireAndExecute(
            String key,
            Supplier<Optional<T>> completedResult,
            Supplier<T> generation,
            boolean acceptCompletedResult) {
        long deadline = System.nanoTime() + waitTimeout.toNanos();
        while (System.nanoTime() < deadline) {
            Optional<AiGenerationLeasePort.Lease> lease =
                    leasePort.tryAcquire(key, leaseDuration);
            if (lease.isPresent()) {
                try {
                    if (acceptCompletedResult) {
                        Optional<T> completed = completedResult.get();
                        if (completed.isPresent()) {
                            return completed.get();
                        }
                    }
                    return generation.get();
                } finally {
                    leasePort.release(lease.get());
                }
            }

            if (acceptCompletedResult) {
                Optional<T> completed = completedResult.get();
                if (completed.isPresent()) {
                    return completed.get();
                }
            }
            waitForNextAttempt();
        }
        throw new DomainException(
                "AI_GENERATION_BUSY",
                "Another AI generation is still in progress. Please try again shortly");
    }

    private void waitForNextAttempt() {
        LockSupport.parkNanos(pollInterval.toNanos());
        if (Thread.currentThread().isInterrupted()) {
            Thread.currentThread().interrupt();
            throw new DomainException(
                    "AI_GENERATION_INTERRUPTED",
                    "AI generation was interrupted while waiting for another request");
        }
    }
}
