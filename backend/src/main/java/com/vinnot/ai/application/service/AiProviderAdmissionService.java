package com.vinnot.ai.application.service;

import com.vinnot.ai.application.config.AiProviderAdmissionPolicy;
import com.vinnot.ai.application.port.out.AiGenerationLeasePort;
import com.vinnot.ai.application.port.out.AiSpendingLedgerPort;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiProviderAdmissionPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Optional;

/** Distributed, fail-fast admission using the same lease port as generation coordination. */
@Service
public class AiProviderAdmissionService implements AiProviderAdmissionPort {

    private static final Logger LOG = LoggerFactory.getLogger(AiProviderAdmissionService.class);
    private final AiGenerationLeasePort leases;
    private final AiSpendingLedgerPort ledger;
    private final AiProviderAdmissionPolicy policy;
    private final Clock clock;

    @Autowired
    public AiProviderAdmissionService(AiGenerationLeasePort leases, AiSpendingLedgerPort ledger,
            AiProviderAdmissionPolicy policy) {
        this(leases, ledger, policy, Clock.systemUTC());
    }

    AiProviderAdmissionService(AiGenerationLeasePort leases, AiSpendingLedgerPort ledger,
            AiProviderAdmissionPolicy policy, Clock clock) {
        this.leases = leases;
        this.ledger = ledger;
        this.policy = policy;
        this.clock = clock;
    }

    @Override
    public Permit acquire(String model, BigDecimal maximumCostUsd) {
        if (!policy.paidCallsEnabled()) {
            throw unavailable("AI_PAID_CALLS_PAUSED", "New AI requests are temporarily paused", null);
        }
        try {
            for (int slot = 0; slot < policy.maximumConcurrentRequests(); slot++) {
                var lease = leases.tryAcquire("provider-capacity:" + slot, policy.leaseDuration());
                if (lease.isPresent()) {
                    return reserve(lease.get(), model, maximumCostUsd);
                }
            }
        } catch (AiSpendingLedgerPort.BudgetExceededException exception) {
            throw unavailable("AI_BUDGET_EXHAUSTED", "The AI budget has been reached", exception);
        } catch (RuntimeException exception) {
            throw unavailable("AI_ADMISSION_UNAVAILABLE", "AI admission is temporarily unavailable", exception);
        }
        throw unavailable("AI_CAPACITY_EXCEEDED", "AI is busy. Please try again shortly", null);
    }

    private Permit reserve(AiGenerationLeasePort.Lease lease, String model, BigDecimal maximumCostUsd) {
        try {
            LocalDate today = LocalDate.now(clock);
            var windows = new ArrayList<AiSpendingLedgerPort.Window>();
            windows.add(new AiSpendingLedgerPort.Window(monthWindowKey(today), policy.monthlyLimitUsd()));
            if (policy.dailyLimitUsd().signum() > 0) {
                windows.add(new AiSpendingLedgerPort.Window("day:" + today, policy.dailyLimitUsd()));
            }
            var reservation = ledger.reserve(model, maximumCostUsd, windows);
            return new Permit(reservation, lease.key(), lease.ownerId());
        } catch (RuntimeException exception) {
            release(lease);
            throw exception;
        }
    }

    /** Ledger key of the monthly spending window that contains the given day. */
    static String monthWindowKey(LocalDate day) {
        return "month:" + YearMonth.from(day);
    }

    @Override
    public void complete(Permit permit, Optional<BigDecimal> observedCostUsd) {
        try {
            ledger.complete(permit.reservationId(), observedCostUsd);
        } catch (RuntimeException exception) {
            // The durable reservation remains charged until operational reconciliation.
            LOG.error("AI spending reconciliation unavailable: {}", exception.getClass().getSimpleName());
        } finally {
            release(new AiGenerationLeasePort.Lease(permit.leaseKey(), permit.leaseOwnerId()));
        }
    }

    private void release(AiGenerationLeasePort.Lease lease) {
        try {
            leases.release(lease);
        } catch (RuntimeException exception) {
            LOG.error("AI capacity release unavailable; lease expires automatically: {}",
                    exception.getClass().getSimpleName());
        }
    }

    private ExternalServiceUnavailableException unavailable(String code, String message, Throwable cause) {
        return new ExternalServiceUnavailableException(code, message, cause);
    }
}
