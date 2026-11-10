package com.vinnot.ai.application.service;

import com.vinnot.ai.application.config.AiGenerationPolicy;

import com.vinnot.ai.application.port.out.AiGenerationLeasePort;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiGenerationCoordinatorTest {

    private static final Duration LEASE_DURATION = Duration.ofMinutes(1);

    @Test
    void returnsCompletedWorkWithoutAcquiringALease() {
        AiGenerationLeasePort leasePort = mock(AiGenerationLeasePort.class);
        AiGenerationCoordinator coordinator = coordinator(
                leasePort, Duration.ofSeconds(1), Duration.ZERO);

        String result = coordinator.execute(
                "profile:1", () -> Optional.of("cached"), () -> "generated");

        assertThat(result).isEqualTo("cached");
        verify(leasePort, never()).tryAcquire(any(), any());
    }

    @Test
    void rechecksCompletedWorkAfterAcquiringAndAlwaysReleasesTheLease() {
        AiGenerationLeasePort leasePort = mock(AiGenerationLeasePort.class);
        AiGenerationLeasePort.Lease lease = lease("profile:2");
        when(leasePort.tryAcquire("profile:2", LEASE_DURATION))
                .thenReturn(Optional.of(lease));
        AtomicInteger reads = new AtomicInteger();
        AiGenerationCoordinator coordinator = coordinator(
                leasePort, Duration.ofSeconds(1), Duration.ZERO);

        String result = coordinator.execute(
                "profile:2",
                () -> reads.incrementAndGet() == 1
                        ? Optional.empty() : Optional.of("completed"),
                () -> "generated");

        assertThat(result).isEqualTo("completed");
        verify(leasePort).release(lease);
    }

    @Test
    void generatesUnderALeaseAndSupportsExclusiveRegeneration() {
        AiGenerationLeasePort leasePort = mock(AiGenerationLeasePort.class);
        AiGenerationLeasePort.Lease sharedLease = lease("profile:3");
        AiGenerationLeasePort.Lease exclusiveLease = lease("profile:4");
        when(leasePort.tryAcquire("profile:3", LEASE_DURATION))
                .thenReturn(Optional.of(sharedLease));
        when(leasePort.tryAcquire("profile:4", LEASE_DURATION))
                .thenReturn(Optional.of(exclusiveLease));
        AiGenerationCoordinator coordinator = coordinator(
                leasePort, Duration.ofSeconds(1), Duration.ZERO);

        assertThat(coordinator.execute(
                "profile:3", Optional::empty, () -> "generated"))
                .isEqualTo("generated");
        assertThat(coordinator.executeExclusively(
                "profile:4", () -> "forced"))
                .isEqualTo("forced");
        verify(leasePort).release(sharedLease);
        verify(leasePort).release(exclusiveLease);
    }

    @Test
    void observesWorkCompletedByAnotherInstanceWhileWaiting() {
        AiGenerationLeasePort leasePort = mock(AiGenerationLeasePort.class);
        when(leasePort.tryAcquire("profile:5", LEASE_DURATION))
                .thenReturn(Optional.empty());
        AtomicInteger reads = new AtomicInteger();
        AiGenerationCoordinator coordinator = coordinator(
                leasePort, Duration.ofSeconds(1), Duration.ZERO);

        String result = coordinator.execute(
                "profile:5",
                () -> reads.incrementAndGet() >= 2
                        ? Optional.of("remote") : Optional.empty(),
                () -> "generated");

        assertThat(result).isEqualTo("remote");
    }

    @Test
    void reportsBusyWhenTheLeaseCannotBeAcquiredBeforeTheDeadline() {
        AiGenerationLeasePort leasePort = mock(AiGenerationLeasePort.class);
        when(leasePort.tryAcquire("profile:6", LEASE_DURATION))
                .thenReturn(Optional.empty());
        AiGenerationCoordinator coordinator = coordinator(
                leasePort, Duration.ofMillis(1), Duration.ZERO);

        assertThatThrownBy(() -> coordinator.execute(
                "profile:6", Optional::empty, () -> "generated"))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("AI_GENERATION_BUSY");
    }

    @Test
    void preservesInterruptionWhileWaiting() {
        AiGenerationLeasePort leasePort = mock(AiGenerationLeasePort.class);
        when(leasePort.tryAcquire("profile:7", LEASE_DURATION))
                .thenReturn(Optional.empty());
        AiGenerationCoordinator coordinator = coordinator(
                leasePort, Duration.ofSeconds(1), Duration.ofMillis(1));

        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(() -> coordinator.execute(
                    "profile:7", Optional::empty, () -> "generated"))
                    .isInstanceOf(DomainException.class)
                    .extracting("code")
                    .isEqualTo("AI_GENERATION_INTERRUPTED");
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    private AiGenerationCoordinator coordinator(
            AiGenerationLeasePort leasePort,
            Duration timeout,
            Duration pollInterval) {
        return new AiGenerationCoordinator(
                leasePort,
                new AiGenerationPolicy(LEASE_DURATION, timeout, pollInterval));
    }

    private AiGenerationLeasePort.Lease lease(String key) {
        return new AiGenerationLeasePort.Lease(key, UUID.randomUUID());
    }
}
