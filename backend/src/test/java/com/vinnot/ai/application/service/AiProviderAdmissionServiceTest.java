package com.vinnot.ai.application.service;

import com.vinnot.ai.application.config.AiProviderAdmissionPolicy;
import com.vinnot.ai.application.port.out.AiGenerationLeasePort;
import com.vinnot.ai.application.port.out.AiSpendingLedgerPort;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.doThrow;

class AiProviderAdmissionServiceTest {
    private final AiGenerationLeasePort leases = mock(AiGenerationLeasePort.class);
    private final AiSpendingLedgerPort ledger = mock(AiSpendingLedgerPort.class);
    private final AiGenerationLeasePort.Lease lease =
            new AiGenerationLeasePort.Lease("provider-capacity:1", UUID.randomUUID());
    private final BigDecimal maximum = new BigDecimal("0.02");
    private final UUID reservationId = UUID.randomUUID();

    @Test
    void reservesMonthlyAndOptionalDailyWindowsAndReleasesOnCompletion() {
        when(leases.tryAcquire("provider-capacity:1", Duration.ofMinutes(2))).thenReturn(Optional.of(lease));
        when(ledger.reserve(eq("model"), eq(maximum), anyList())).thenReturn(reservationId);
        var service = service(true, BigDecimal.ONE);
        var permit = service.acquire("model", maximum);
        verify(ledger).reserve("model", maximum, List.of(
                new AiSpendingLedgerPort.Window("month:2026-09", new BigDecimal("30")),
                new AiSpendingLedgerPort.Window("day:2026-09-29", BigDecimal.ONE)));
        assertThat(permit.reservationId()).isEqualTo(reservationId);
        service.complete(permit, Optional.of(new BigDecimal("0.01")));
        verify(ledger).complete(reservationId, Optional.of(new BigDecimal("0.01")));
        verify(leases).release(lease);
    }

    @Test
    void noDailyLimitDoesNotCreateDailyWindowAndUnknownBillingRemainsReserved() {
        when(leases.tryAcquire("provider-capacity:1", Duration.ofMinutes(2))).thenReturn(Optional.of(lease));
        when(ledger.reserve(eq("model"), eq(maximum), anyList())).thenReturn(reservationId);
        var service = service(true, BigDecimal.ZERO);
        var permit = service.acquire("model", maximum);
        verify(ledger).reserve("model", maximum, List.of(
                new AiSpendingLedgerPort.Window("month:2026-09", new BigDecimal("30"))));
        service.complete(permit, Optional.empty());
        verify(ledger).complete(reservationId, Optional.empty());
        verify(leases).release(lease);
    }

    @Test
    void rejectsBackgroundSaturationWithoutQueuingOrTouchingTheInteractiveSlot() {
        var service = new AiProviderAdmissionService(leases, ledger, policy(true, BigDecimal.ZERO));
        assertCode(() -> service.acquire("model", maximum), "AI_CAPACITY_EXCEEDED");
        verifyNoInteractions(ledger);
        verify(leases).tryAcquire("provider-capacity:0", Duration.ofMinutes(2));
        verify(leases).tryAcquire("provider-capacity:1", Duration.ofMinutes(2));
        verify(leases, never()).tryAcquire(eq("provider-capacity:2"), any());
    }

    @Test
    void interactiveRequestsTryTheKeptSlotFirst() {
        var kept = new AiGenerationLeasePort.Lease("provider-capacity:2", UUID.randomUUID());
        when(leases.tryAcquire("provider-capacity:2", Duration.ofMinutes(2))).thenReturn(Optional.of(kept));
        when(ledger.reserve(eq("model"), eq(maximum), anyList())).thenReturn(reservationId);

        var permit = service(true, BigDecimal.ZERO).acquireInteractive("model", maximum, Duration.ofSeconds(4));

        assertThat(permit.leaseKey()).isEqualTo("provider-capacity:2");
        verify(leases, never()).tryAcquire(eq("provider-capacity:0"), any());
    }

    @Test
    void interactiveRequestsWaitForASlotToFreeUp() {
        when(leases.tryAcquire("provider-capacity:0", Duration.ofMinutes(2)))
                .thenReturn(Optional.empty(), Optional.empty(), Optional.of(lease));
        when(ledger.reserve(eq("model"), eq(maximum), anyList())).thenReturn(reservationId);

        long started = System.nanoTime();
        var permit = service(true, BigDecimal.ZERO).acquireInteractive("model", maximum, Duration.ofSeconds(4));

        assertThat(permit.reservationId()).isEqualTo(reservationId);
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isGreaterThanOrEqualTo(Duration.ofMillis(350));
    }

    @Test
    void interactiveWaitIsCappedByPolicyAndByTheCaller() {
        var shortWait = new AiProviderAdmissionService(leases, ledger, new AiProviderAdmissionPolicy(
                3, Duration.ofMinutes(2), new BigDecimal("30"), BigDecimal.ZERO, true, Duration.ofMillis(300)));
        long started = System.nanoTime();
        assertCode(() -> shortWait.acquireInteractive("model", maximum, Duration.ofSeconds(10)),
                "AI_CAPACITY_EXCEEDED");
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));

        started = System.nanoTime();
        assertCode(() -> service(true, BigDecimal.ZERO).acquireInteractive("model", maximum, Duration.ofSeconds(-1)),
                "AI_CAPACITY_EXCEEDED");
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofMillis(300));
        verifyNoInteractions(ledger);
    }

    @Test
    void anInterruptedWaitGivesUpAndKeepsTheInterruptFlag() {
        Thread.currentThread().interrupt();
        try {
            assertCode(() -> service(true, BigDecimal.ZERO).acquireInteractive("model", maximum, Duration.ofSeconds(4)),
                    "AI_CAPACITY_EXCEEDED");
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
        verifyNoInteractions(ledger);
    }

    @Test
    void withFewerThanThreeSlotsNothingIsKeptForInteractiveRequests() {
        var two = new AiProviderAdmissionService(leases, ledger, new AiProviderAdmissionPolicy(
                2, Duration.ofMinutes(2), new BigDecimal("30"), BigDecimal.ZERO, true));
        assertCode(() -> two.acquire("model", maximum), "AI_CAPACITY_EXCEEDED");
        verify(leases).tryAcquire("provider-capacity:1", Duration.ofMinutes(2));
        assertCode(() -> service(false, BigDecimal.ZERO).acquireInteractive("model", maximum, Duration.ofSeconds(1)),
                "AI_PAID_CALLS_PAUSED");
    }

    @Test
    void pausedPaidCallsDoNotConsumeExecutionOrFinancialCapacity() {
        assertCode(() -> service(false, BigDecimal.ZERO).acquire("model", maximum), "AI_PAID_CALLS_PAUSED");
        verifyNoInteractions(ledger, leases);
    }

    @Test
    void releasesLeaseWhenBudgetOrAccountingRejectsAdmission() {
        when(leases.tryAcquire("provider-capacity:1", Duration.ofMinutes(2))).thenReturn(Optional.of(lease));
        when(ledger.reserve(eq("model"), eq(maximum), anyList()))
                .thenThrow(new AiSpendingLedgerPort.BudgetExceededException());
        assertCode(() -> service(true, BigDecimal.ZERO).acquire("model", maximum), "AI_BUDGET_EXHAUSTED");
        verify(leases).release(lease);
    }

    @Test
    void failsClosedWhenTheAdmissionStoreIsUnavailable() {
        when(leases.tryAcquire(any(), any())).thenThrow(new IllegalStateException("private database detail"));
        assertCode(() -> service(true, BigDecimal.ZERO).acquire("model", maximum), "AI_ADMISSION_UNAVAILABLE");
        verifyNoInteractions(ledger);
    }

    @Test
    void releaseAndSettlementFailureDoNotDiscardAnAlreadyPaidSuccessfulResponse() {
        when(leases.tryAcquire("provider-capacity:1", Duration.ofMinutes(2))).thenReturn(Optional.of(lease));
        when(ledger.reserve(eq("model"), eq(maximum), anyList())).thenReturn(reservationId);
        doThrow(new IllegalStateException("private")).when(ledger).complete(eq(reservationId), any());
        doThrow(new IllegalStateException("private")).when(leases).release(lease);
        var service = service(true, BigDecimal.ZERO);
        service.complete(service.acquire("model", maximum), Optional.empty());
        verify(leases).release(lease);
    }

    private AiProviderAdmissionService service(boolean enabled, BigDecimal daily) {
        return new AiProviderAdmissionService(leases, ledger, policy(enabled, daily),
                Clock.fixed(Instant.parse("2026-09-29T12:00:00Z"), ZoneOffset.UTC));
    }

    private AiProviderAdmissionPolicy policy(boolean enabled, BigDecimal daily) {
        return new AiProviderAdmissionPolicy(3, Duration.ofMinutes(2), new BigDecimal("30"), daily, enabled);
    }

    private void assertCode(Runnable action, String code) {
        assertThatThrownBy(action::run).isInstanceOf(ExternalServiceUnavailableException.class)
                .extracting("code").isEqualTo(code);
    }
}
