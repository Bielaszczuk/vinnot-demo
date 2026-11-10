package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.model.EngagementMetrics;
import com.vinnot.engagement.application.port.out.EngagementMetricsPort;
import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S17: per type sent, opened, opted out and held out; noisy types are paused automatically. */
class EngagementMetricsServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-21T07:00:00Z");
    private static final Duration OPT_OUT_WINDOW = Duration.ofHours(48);
    private final EngagementMetricsPort counts = mock(EngagementMetricsPort.class);
    private final PushPlanningUseCase planning = mock(PushPlanningUseCase.class);
    private final EngagementMetricsService.AutoPause autoPause =
            new EngagementMetricsService.AutoPause(true, Duration.ofDays(7), OPT_OUT_WINDOW, 0.02, 200);

    @Test
    void everyEngagementTypeIsListedWithItsCountsRatesAndSwitch() {
        when(counts.countsSince(NOW.minus(Duration.ofDays(7)), OPT_OUT_WINDOW)).thenReturn(Map.of(
                NotificationType.TASTE_PICK, new EngagementMetrics.Counts(400, 100, 4, 20)));
        when(planning.switchedOff()).thenReturn(Set.of(NotificationType.WINBACK));

        EngagementMetrics metrics = service(autoPause).metrics(7);

        assertThat(metrics.days()).isEqualTo(7);
        assertThat(metrics.since()).isEqualTo(NOW.minus(Duration.ofDays(7)));
        assertThat(metrics.types()).extracting(EngagementMetrics.TypeMetrics::type)
                .containsExactlyElementsOf(EngagementHistoryReader.ENGAGEMENT_TYPES.stream().sorted().toList());
        EngagementMetrics.TypeMetrics taste = metrics.types().stream().filter(type -> type.type() == NotificationType.TASTE_PICK)
                .findFirst().orElseThrow();
        assertThat(taste).isEqualTo(new EngagementMetrics.TypeMetrics(NotificationType.TASTE_PICK, 400, 100, 4, 20, true));
        assertThat(taste.openRate()).isEqualTo(0.25);
        assertThat(taste.optOutRate()).isEqualTo(0.01);
        EngagementMetrics.TypeMetrics winback = metrics.types().stream().filter(type -> type.type() == NotificationType.WINBACK)
                .findFirst().orElseThrow();
        assertThat(winback.enabled()).isFalse();
        assertThat(winback.openRate()).isZero();
        assertThat(winback.optOutRate()).isZero();
        assertThatThrownBy(() -> service(autoPause).metrics(3)).isInstanceOf(DomainException.class);
    }

    @Test
    void aTypeWhoseOptOutsPerSendExceedTheThresholdWithEnoughSendsIsPausedOnce() {
        when(counts.countsSince(everyTypeSince(NOW.minus(Duration.ofDays(7))), OPT_OUT_WINDOW)).thenReturn(Map.of(
                NotificationType.TASTE_PICK, new EngagementMetrics.Counts(300, 10, 9, 0),
                NotificationType.ROUTE_PICK, new EngagementMetrics.Counts(300, 10, 6, 0),
                NotificationType.WINBACK, new EngagementMetrics.Counts(100, 0, 50, 0),
                NotificationType.CELLAR_CHECKIN, new EngagementMetrics.Counts(500, 0, 400, 0),
                NotificationType.ONBOARDING, new EngagementMetrics.Counts(500, 0, 400, 0)));
        when(planning.switchedOff()).thenReturn(Set.of(NotificationType.CELLAR_CHECKIN));
        when(planning.pauseAutomatically(NotificationType.TASTE_PICK)).thenReturn(true);
        when(planning.pauseAutomatically(NotificationType.ONBOARDING)).thenReturn(false);

        assertThat(service(autoPause).pauseNoisyTypes(NOW)).containsExactly(NotificationType.TASTE_PICK);

        verify(planning, never()).pauseAutomatically(NotificationType.ROUTE_PICK);
        verify(planning, never()).pauseAutomatically(NotificationType.WINBACK);
        verify(planning, never()).pauseAutomatically(NotificationType.CELLAR_CHECKIN);
    }

    /** S17: once an administrator turns a paused type back on, only sends after that count toward a new pause. */
    @Test
    void aTypeTurnedBackOnIsOnlyJudgedBySendsAfterThat() {
        Instant turnedOn = NOW.minus(Duration.ofDays(2));
        Instant windowStart = NOW.minus(Duration.ofDays(7));
        when(planning.lastTurnedOn()).thenReturn(Map.of(NotificationType.TASTE_PICK, turnedOn,
                NotificationType.ROUTE_PICK, NOW.minus(Duration.ofDays(30))));
        when(planning.switchedOff()).thenReturn(Set.of());
        Map<NotificationType, Instant> since = everyTypeSince(windowStart);
        since.put(NotificationType.TASTE_PICK, turnedOn);
        when(counts.countsSince(since, OPT_OUT_WINDOW)).thenReturn(Map.of(
                NotificationType.TASTE_PICK, new EngagementMetrics.Counts(10, 0, 1, 0)));

        assertThat(service(autoPause).pauseNoisyTypes(NOW)).as("too few sends since it was turned on").isEmpty();
        verify(counts).countsSince(since, OPT_OUT_WINDOW);
        verify(planning, never()).pauseAutomatically(NotificationType.TASTE_PICK);
    }

    @Test
    void autoPauseCanBeTurnedOffAndItsSettingsAreValidated() {
        var off = new EngagementMetricsService.AutoPause(false, Duration.ofDays(7), OPT_OUT_WINDOW, 0.02, 200);
        assertThat(service(off).pauseNoisyTypes(NOW)).isEmpty();
        verifyNoInteractions(counts, planning);
        assertThatThrownBy(() -> new EngagementMetricsService.AutoPause(true, Duration.ZERO, OPT_OUT_WINDOW, 0.02, 200))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementMetricsService.AutoPause(true, Duration.ofDays(7), Duration.ZERO, 0.02, 200))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementMetricsService.AutoPause(true, Duration.ofDays(7), OPT_OUT_WINDOW, 0, 200))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementMetricsService.AutoPause(true, Duration.ofDays(7), OPT_OUT_WINDOW, 1.5, 200))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementMetricsService.AutoPause(true, Duration.ofDays(7), OPT_OUT_WINDOW, 0.02, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new EngagementMetricsService(counts, planning, true, Duration.ofDays(7), OPT_OUT_WINDOW, 0.02, 200)).isNotNull();
    }

    private static Map<NotificationType, Instant> everyTypeSince(Instant since) {
        Map<NotificationType, Instant> starts = new EnumMap<>(NotificationType.class);
        EngagementHistoryReader.ENGAGEMENT_TYPES.forEach(type -> starts.put(type, since));
        return starts;
    }

    private EngagementMetricsService service(EngagementMetricsService.AutoPause settings) {
        return new EngagementMetricsService(counts, planning, settings, Clock.fixed(NOW, ZoneOffset.UTC));
    }
}
