package com.vinnot.notification.application.service;

import com.vinnot.activity.application.command.model.RecordAppOpenCommand;
import com.vinnot.activity.application.port.in.RecordAppOpenUseCase;
import com.vinnot.notification.application.model.PushOpen;
import com.vinnot.notification.application.port.in.PushOpenUseCase;
import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.PushOpenStorePort;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Records opened pushes (#405). An announcement's push (#490) is recognized by its ref, the dedupe key its push
 * carries, and its first open by each account also counts against the announcement, in the same transaction.
 */
@Service
public class PushOpenService implements PushOpenUseCase {
    /** The longest dedupe ref a push carries. */
    public static final int MAX_REF_LENGTH = 180;
    private final PushOpenStorePort store;
    private final RecordAppOpenUseCase appOpens;
    private final AnnouncementStatsPort announcementStats;
    private final Clock clock;

    @Autowired
    public PushOpenService(PushOpenStorePort store, RecordAppOpenUseCase appOpens,
            AnnouncementStatsPort announcementStats) {
        this(store, appOpens, announcementStats, Clock.systemUTC());
    }

    PushOpenService(PushOpenStorePort store, RecordAppOpenUseCase appOpens, AnnouncementStatsPort announcementStats,
            Clock clock) {
        this.store = store;
        this.appOpens = appOpens;
        this.announcementStats = announcementStats;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void record(UUID userId, String ref, NotificationType type) {
        if (Objects.isNull(ref) || ref.isBlank() || ref.length() > MAX_REF_LENGTH || Objects.isNull(type)) {
            throw new DomainException("INVALID_PUSH_REF", "A push open needs its ref of at most 180 characters and its type");
        }
        if (store.save(userId, ref, type, clock.instant()) && AnnouncementRef.TYPES.contains(type)) {
            AnnouncementRef.of(ref).ifPresent(announcement -> announcementStats.recordPushOpen(announcement, userId, ref));
        }
        appOpens.execute(new RecordAppOpenCommand(userId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PushOpen> opensSince(Collection<UUID> userIds, Set<NotificationType> types, Instant since) {
        if (userIds.isEmpty() || types.isEmpty()) {
            return List.of();
        }
        return store.findSince(userIds, types, since);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<NotificationType, Long> openCountsSince(Instant since) {
        return store.countByTypeSince(since);
    }
}
