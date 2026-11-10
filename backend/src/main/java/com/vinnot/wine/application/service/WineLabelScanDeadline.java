package com.vinnot.wine.application.service;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import java.time.Duration;
import java.util.function.LongSupplier;

/** One monotonic request budget, shared across catalog attempts and visual recognition. */
public final class WineLabelScanDeadline {
    public static final Duration DEFAULT_BUDGET = Duration.ofSeconds(18);
    private final long started;
    private final long allowance;
    private final LongSupplier ticker;

    public WineLabelScanDeadline(Duration allowance) {
        this(allowance, System::nanoTime);
    }

    WineLabelScanDeadline(Duration allowance, LongSupplier ticker) {
        this.ticker = ticker;
        this.started = ticker.getAsLong();
        this.allowance = allowance.toNanos();
    }

    public Duration remaining() {
        long remaining = allowance - (ticker.getAsLong() - started);
        if (remaining <= 0 || Thread.currentThread().isInterrupted()) {
            throw new ExternalServiceUnavailableException("LABEL_SCAN_TIMEOUT", "Wine-label scan exceeded its time budget", null);
        }
        return Duration.ofNanos(remaining);
    }

    /** A bounded sub-stage cannot consume the budget reserved for later stages. */
    public WineLabelScanDeadline limitedTo(Duration budget) {
        Duration remaining = remaining();
        return new WineLabelScanDeadline(remaining.compareTo(budget) < 0 ? remaining : budget, ticker);
    }
}
