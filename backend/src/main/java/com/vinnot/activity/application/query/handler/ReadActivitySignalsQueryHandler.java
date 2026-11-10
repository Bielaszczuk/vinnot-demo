package com.vinnot.activity.application.query.handler;

import com.vinnot.activity.application.port.in.ReadActivitySignalsUseCase;
import com.vinnot.activity.application.port.out.AppOpenRepositoryPort;
import com.vinnot.activity.application.port.out.ContentViewRepositoryPort;
import com.vinnot.activity.domain.model.ActivityRhythm;
import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.OpenHourHistogram;
import com.vinnot.activity.domain.model.ViewedContent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReadActivitySignalsQueryHandler implements ReadActivitySignalsUseCase {
    private final AppOpenRepositoryPort opens;
    private final ContentViewRepositoryPort views;
    private final Duration usualHourWindow;
    private final Clock clock;

    @Autowired
    public ReadActivitySignalsQueryHandler(AppOpenRepositoryPort opens, ContentViewRepositoryPort views,
            @Value("${app.activity.usual-hour-window:30d}") Duration usualHourWindow) {
        this(opens, views, usualHourWindow, Clock.systemUTC());
    }

    ReadActivitySignalsQueryHandler(AppOpenRepositoryPort opens, ContentViewRepositoryPort views,
            Duration usualHourWindow, Clock clock) {
        if (usualHourWindow.isNegative() || usualHourWindow.isZero()) {
            throw new IllegalArgumentException("app.activity.usual-hour-window must be positive");
        }
        this.opens = opens;
        this.views = views;
        this.usualHourWindow = usualHourWindow;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, ActivityRhythm> rhythms(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Instant> lastActive = opens.lastActive(userIds);
        Map<UUID, OpenHourHistogram> hours = opens.openHoursSince(userIds, clock.instant().minus(usualHourWindow));
        Map<UUID, ActivityRhythm> rhythms = new HashMap<>();
        lastActive.forEach((user, at) -> rhythms.put(user, new ActivityRhythm(user, at, hours.get(user))));
        return rhythms;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, List<ViewedContent>> viewsSince(Collection<UUID> userIds, ContentKind kind, Instant since) {
        return userIds.isEmpty() ? Map.of() : views.viewsSince(userIds, kind, since);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ViewedContent> mostViewed(ContentKind kind, Instant since, int limit) {
        if (limit < 1) {
            throw new IllegalArgumentException("limit must be positive");
        }
        return views.mostViewed(kind, since, limit);
    }
}
