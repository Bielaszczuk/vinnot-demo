package com.vinnot.wine.infrastructure.metrics;

import com.vinnot.wine.application.port.out.WineLabelMetricsPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class MicrometerWineLabelMetricsAdapter implements WineLabelMetricsPort {

    private final MeterRegistry registry;

    @Override
    public void recordScan(
            WineLabelScanResponse.Outcome outcome, Duration duration,
            boolean visualFallbackUsed) {
        registry.counter("vinnot.wine_label.scan.total",
                        "outcome", outcome.name(),
                        "visual_fallback", Boolean.toString(visualFallbackUsed))
                .increment();
        Timer.builder("vinnot.wine_label.scan.duration")
                .tag("outcome", outcome.name())
                .register(registry)
                .record(duration);
    }

    @Override
    public void recordSubmission(WineSubmissionStatus status, Duration duration) {
        registry.counter("vinnot.wine_label.submission.total",
                        "status", status.name())
                .increment();
        Timer.builder("vinnot.wine_label.submission.duration")
                .tag("status", status.name())
                .register(registry)
                .record(duration);
    }

    @Override
    public void recordScanStage(
            ScanStage stage, Duration duration, boolean successful) {
        Timer.builder("vinnot.wine_label.scan.stage.duration")
                .tag("stage", stage.name())
                .tag("outcome", successful ? "SUCCESS" : "FAILURE")
                .register(registry)
                .record(duration);
    }
}
