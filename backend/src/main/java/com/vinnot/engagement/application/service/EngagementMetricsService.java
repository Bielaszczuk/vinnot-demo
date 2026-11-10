package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.model.EngagementMetrics;
import com.vinnot.engagement.application.port.in.AutoPauseEngagementUseCase;
import com.vinnot.engagement.application.port.in.ReadEngagementMetricsUseCase;
import com.vinnot.engagement.application.port.out.EngagementMetricsPort;
import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Engagement measurement (#405, S17): per type, pushes sent, opened, followed by an opt-out of their category within the
 * opt-out window, and held out. A type whose opt-outs per send exceed the threshold over the window, with at least the
 * minimum number of sends, is switched off automatically and logged; an administrator turns it on again, and from then
 * on only the pushes sent after that are judged, so the sends that caused the pause never pause it again.
 */
@Service
public class EngagementMetricsService implements ReadEngagementMetricsUseCase, AutoPauseEngagementUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(EngagementMetricsService.class);
    private final EngagementMetricsPort counts;
    private final PushPlanningUseCase planning;
    private final AutoPause autoPause;
    private final Clock clock;

    /**
     * @param enabled      whether noisy types are paused automatically
     * @param window       how far back sends are evaluated
     * @param optOutWindow how soon after a push an opt-out counts against it
     * @param maxOptOutRate opt-outs per send above which the type is paused (0-1)
     * @param minSends     sends needed in the window before a type can be paused
     */
    public record AutoPause(boolean enabled, Duration window, Duration optOutWindow, double maxOptOutRate, int minSends) {
        public AutoPause {
            if (!window.isPositive() || !optOutWindow.isPositive() || maxOptOutRate <= 0 || maxOptOutRate > 1 || minSends < 1) {
                throw new IllegalArgumentException("Invalid app.engagement.auto-pause settings");
            }
        }
    }

    @Autowired
    public EngagementMetricsService(EngagementMetricsPort counts, PushPlanningUseCase planning,
            @Value("${app.engagement.auto-pause.enabled:true}") boolean enabled,
            @Value("${app.engagement.auto-pause.window:7d}") Duration window,
            @Value("${app.engagement.auto-pause.opt-out-window:48h}") Duration optOutWindow,
            @Value("${app.engagement.auto-pause.opt-out-rate:0.02}") double maxOptOutRate,
            @Value("${app.engagement.auto-pause.min-sends:200}") int minSends) {
        this(counts, planning, new AutoPause(enabled, window, optOutWindow, maxOptOutRate, minSends), Clock.systemUTC());
    }

    EngagementMetricsService(EngagementMetricsPort counts, PushPlanningUseCase planning, AutoPause autoPause, Clock clock) {
        this.counts = counts;
        this.planning = planning;
        this.autoPause = autoPause;
        this.clock = clock;
    }

    @Override
    public EngagementMetrics metrics(int days) {
        if (!WINDOWS.contains(days)) {
            throw new DomainException("INVALID_METRICS_WINDOW", "Choose a window of 1, 7 or 30 days");
        }
        Instant since = clock.instant().minus(Duration.ofDays(days));
        Map<NotificationType, EngagementMetrics.Counts> stored = counts.countsSince(since, autoPause.optOutWindow());
        Set<NotificationType> off = planning.switchedOff();
        List<EngagementMetrics.TypeMetrics> types = EngagementHistoryReader.ENGAGEMENT_TYPES.stream()
                .sorted(Comparator.comparing(Enum::ordinal))
                .map(type -> {
                    EngagementMetrics.Counts count = stored.getOrDefault(type, EngagementMetrics.Counts.NONE);
                    return new EngagementMetrics.TypeMetrics(type, count.sent(), count.opened(), count.optedOut(),
                            count.heldOut(), !off.contains(type));
                })
                .toList();
        return new EngagementMetrics(days, since, types);
    }

    @Override
    public List<NotificationType> pauseNoisyTypes(Instant now) {
        if (!autoPause.enabled()) {
            return List.of();
        }
        Instant windowStart = now.minus(autoPause.window());
        Map<NotificationType, Instant> turnedOn = planning.lastTurnedOn();
        Map<NotificationType, Instant> since = new EnumMap<>(NotificationType.class);
        EngagementHistoryReader.ENGAGEMENT_TYPES.forEach(type -> since.put(type, latest(windowStart, turnedOn.get(type))));
        Map<NotificationType, EngagementMetrics.Counts> stored = counts.countsSince(since, autoPause.optOutWindow());
        Set<NotificationType> off = planning.switchedOff();
        List<NotificationType> paused = new ArrayList<>();
        stored.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(entry -> {
            EngagementMetrics.Counts count = entry.getValue();
            boolean noisy = count.sent() >= autoPause.minSends()
                    && (double) count.optedOut() / count.sent() > autoPause.maxOptOutRate();
            if (noisy && !off.contains(entry.getKey()) && planning.pauseAutomatically(entry.getKey())) {
                LOGGER.warn("Paused engagement push {}: {} opt-out(s) after {} send(s) in {} exceed the {} limit",
                        entry.getKey(), count.optedOut(), count.sent(), autoPause.window(), autoPause.maxOptOutRate());
                paused.add(entry.getKey());
            }
        });
        return paused;
    }

    private static Instant latest(Instant windowStart, Instant turnedOn) {
        return Objects.nonNull(turnedOn) && turnedOn.isAfter(windowStart) ? turnedOn : windowStart;
    }
}
