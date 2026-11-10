package com.vinnot.wine.application.service;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineLabelScanDeadlineTest {
    @Test
    void limitsSubStagesWithoutResettingTheParentBudget() {
        AtomicLong clock = new AtomicLong();
        var parent = new WineLabelScanDeadline(Duration.ofSeconds(18), clock::get);
        var local = parent.limitedTo(Duration.ofSeconds(3));
        clock.addAndGet(Duration.ofSeconds(3).toNanos());
        assertThatThrownBy(local::remaining).isInstanceOf(ExternalServiceUnavailableException.class);
        assertThat(parent.remaining()).isEqualTo(Duration.ofSeconds(15));
        assertThat(parent.limitedTo(Duration.ofSeconds(20)).remaining()).isEqualTo(Duration.ofSeconds(15));
    }

    @Test
    void accountsForElapsedTimeAcrossStages() {
        AtomicLong clock = new AtomicLong(100);
        var deadline = new WineLabelScanDeadline(Duration.ofNanos(50), clock::get);
        clock.addAndGet(20);
        assertThat(deadline.remaining()).isEqualTo(Duration.ofNanos(30));
        clock.addAndGet(30);
        assertThatThrownBy(deadline::remaining).isInstanceOf(ExternalServiceUnavailableException.class)
                .extracting("code").isEqualTo("LABEL_SCAN_TIMEOUT");
    }

    @Test
    void usesMonotonicClockAndHonorsInterruptionWithoutClearingIt() {
        var deadline = new WineLabelScanDeadline(WineLabelScanDeadline.DEFAULT_BUDGET);
        assertThat(deadline.remaining()).isPositive().isLessThanOrEqualTo(WineLabelScanDeadline.DEFAULT_BUDGET);
        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(deadline::remaining).isInstanceOf(ExternalServiceUnavailableException.class);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }
}
