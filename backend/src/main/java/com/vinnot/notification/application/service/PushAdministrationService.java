package com.vinnot.notification.application.service;

import com.vinnot.notification.application.model.PushMetrics;
import com.vinnot.notification.application.model.PushSettings;
import com.vinnot.notification.application.port.in.ManagePushTypesUseCase;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.application.port.out.PushMetricsPort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The admin push controls (#310). Switches are stored and audited by {@link PushTypeSwitchPort} and read by delivery;
 * the server's {@code PUSH_PROVIDER} is only shown, it stays the global last-resort switch.
 */
@Service
public class PushAdministrationService implements ManagePushTypesUseCase {
    static final int RECENT_CHANGES = 20;
    private final PushRendererPort renderer;
    private final PushTypeSwitchPort switches;
    private final PushMetricsPort metrics;
    private final NotificationRecipientDirectoryPort directory;
    private final String provider;
    private final Clock clock;

    @Autowired
    public PushAdministrationService(PushRendererPort renderer, PushTypeSwitchPort switches, PushMetricsPort metrics,
            NotificationRecipientDirectoryPort directory, @Value("${app.notifications.push.provider:log}") String provider) {
        this(renderer, switches, metrics, directory, provider, Clock.systemUTC());
    }

    PushAdministrationService(PushRendererPort renderer, PushTypeSwitchPort switches, PushMetricsPort metrics,
            NotificationRecipientDirectoryPort directory, String provider, Clock clock) {
        this.renderer = renderer;
        this.switches = switches;
        this.metrics = metrics;
        this.directory = directory;
        this.provider = provider;
        this.clock = clock;
    }

    @Override
    public PushSettings settings() {
        Set<NotificationType> disabled = switches.disabledTypes();
        var types = pushedTypes().stream()
                .map(type -> new PushSettings.TypeSetting(type, type.category(), type.category().transactional(),
                        !disabled.contains(type)))
                .toList();
        return new PushSettings(provider, types, switches.recentChanges(RECENT_CHANGES));
    }

    @Override
    @Transactional
    public PushSettings setEnabled(NotificationType type, boolean enabled, UUID actorId) {
        if (!renderer.types().contains(type)) {
            throw new DomainException("NOT_A_PUSH_TYPE", "This notification type is never pushed");
        }
        String email = directory.findUser(actorId).map(user -> user.recipient().email())
                .orElseThrow(() -> new DomainException("ADMIN_NOT_FOUND", "The administrator account was not found"));
        switches.change(type, enabled, new PushTypeSwitchPort.Actor(actorId, email), clock.instant());
        return settings();
    }

    @Override
    public PushMetrics metrics(int days) {
        if (!METRIC_WINDOWS.contains(days)) {
            throw new DomainException("INVALID_METRICS_WINDOW", "Choose a window of 1, 7 or 30 days");
        }
        LocalDate from = clock.instant().atOffset(ZoneOffset.UTC).toLocalDate().minusDays(days - 1L);
        Map<NotificationType, Map<PushOutcome, Long>> totals = metrics.totalsSince(from);
        var types = pushedTypes().stream().map(type -> {
            Map<PushOutcome, Long> counts = new EnumMap<>(PushOutcome.class);
            for (PushOutcome outcome : PushOutcome.values()) {
                counts.put(outcome, totals.getOrDefault(type, Map.of()).getOrDefault(outcome, 0L));
            }
            return new PushMetrics.TypeCounts(type, counts);
        }).toList();
        return new PushMetrics(days, from, types);
    }

    private List<NotificationType> pushedTypes() {
        return renderer.types().stream().sorted(Comparator.comparing(Enum::ordinal)).toList();
    }
}
