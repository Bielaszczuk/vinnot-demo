package com.vinnot.wine.infrastructure.visual;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import com.vinnot.wine.application.service.WineVisualIndexService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WineVisualIndexSchedulerTest {

    private final WineVisualIndexService service = mock(WineVisualIndexService.class);
    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-12T00:00:00Z"));
    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();
    private final Logger logger = (Logger) LoggerFactory.getLogger(WineVisualIndexScheduler.class);

    @BeforeEach
    void captureLogs() {
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void releaseLogs() {
        logger.detachAppender(logs);
        logs.stop();
    }

    @Test
    void pausesTheBackfillWhileTheProviderIsOutOfQuotaAndDoublesThePause() {
        var scheduler = new WineVisualIndexScheduler(service, true, 200, clock);
        when(service.backfill(200)).thenThrow(limited("402")).thenThrow(limited("429")).thenReturn(3);

        assertThat(scheduler.refresh()).isZero();
        clock.advance(WineVisualIndexScheduler.FIRST_PAUSE.minusSeconds(1));
        assertThat(scheduler.refresh()).isZero();
        verify(service, times(1)).backfill(200);

        clock.advance(Duration.ofSeconds(1));
        assertThat(scheduler.refresh()).isZero();
        clock.advance(WineVisualIndexScheduler.FIRST_PAUSE.multipliedBy(2).minusSeconds(1));
        assertThat(scheduler.refresh()).isZero();
        verify(service, times(2)).backfill(200);

        clock.advance(Duration.ofSeconds(1));
        assertThat(scheduler.refresh()).isEqualTo(3);
        assertThat(logs.list).extracting(ILoggingEvent::getFormattedMessage).containsExactly(
                "Visual index refresh paused for 5 min: Image embedding provider answered 402",
                "Visual index refresh paused for 10 min: Image embedding provider answered 429",
                "Embedded 3 catalog label image(s) for visual search");
    }

    @Test
    void successEndsThePauseAndThePauseNeverExceedsTheMaximum() {
        var scheduler = new WineVisualIndexScheduler(service, true, 200, clock);
        when(service.backfill(200)).thenThrow(limited("429"));
        for (int run = 0; run < 12; run++) {
            scheduler.refresh();
            clock.advance(WineVisualIndexScheduler.MAX_PAUSE);
        }
        assertThat(logs.list.getLast().getFormattedMessage())
                .isEqualTo("Visual index refresh paused for 360 min: Image embedding provider answered 429");

        doReturn(0).doThrow(limited("429")).when(service).backfill(200);
        assertThat(scheduler.refresh()).isZero();
        assertThat(scheduler.refresh()).isZero();
        assertThat(logs.list.getLast().getFormattedMessage())
                .isEqualTo("Visual index refresh paused for 5 min: Image embedding provider answered 429");
    }

    @Test
    void otherFailuresAreLoggedWithTheirCodeAndRetriedOnTheNextRun() {
        var scheduler = new WineVisualIndexScheduler(service, true, 200, clock);
        when(service.backfill(200))
                .thenThrow(new ExternalServiceUnavailableException("IMAGE_EMBEDDING_UNAVAILABLE",
                        "Image embedding provider answered 500", null))
                .thenThrow(new IllegalStateException("private detail"))
                .thenReturn(0);

        assertThat(scheduler.refresh()).isZero();
        assertThat(scheduler.refresh()).isZero();
        assertThat(scheduler.refresh()).isZero();

        verify(service, times(3)).backfill(200);
        assertThat(logs.list).extracting(ILoggingEvent::getFormattedMessage).containsExactly(
                "Visual index refresh failed: IMAGE_EMBEDDING_UNAVAILABLE Image embedding provider answered 500",
                "Visual index refresh failed: IllegalStateException");
    }

    @Test
    void disabledSchedulerNeverTouchesTheIndexAndValidatesTheBatch() {
        new WineVisualIndexScheduler(service, false, 200).refresh();
        verify(service, never()).load();
        assertThatThrownBy(() -> new WineVisualIndexScheduler(service, true, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static ExternalServiceUnavailableException limited(String status) {
        return new ExternalServiceUnavailableException(WineImageEmbeddingPort.PROVIDER_LIMITED,
                "Image embedding provider answered " + status, null);
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
