package com.vinnot.notification.application.service;

import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.application.port.in.SendAnnouncementUseCase;
import com.vinnot.notification.application.port.out.AnnouncementAudiencePort;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Records administrators' announcements (#310) with who sent them and how many accounts they reached at that moment.
 * A client request id makes a send idempotent: a repeat (a retried or doubled request) returns the first send, also
 * when two arrive at once, since only one insert of that id succeeds. Nothing is queued here: {@link DeliverAnnouncementsService} walks the audience in batches afterwards.
 */
@Service
public class AnnouncementCampaignService implements SendAnnouncementUseCase {
    static final int HISTORY_SIZE = 20;
    private final AnnouncementAudiencePort audiences;
    private final AnnouncementStorePort store;
    private final NotificationRecipientDirectoryPort directory;
    private final Clock clock;

    @Autowired
    public AnnouncementCampaignService(AnnouncementAudiencePort audiences, AnnouncementStorePort store,
            NotificationRecipientDirectoryPort directory) {
        this(audiences, store, directory, Clock.systemUTC());
    }

    AnnouncementCampaignService(AnnouncementAudiencePort audiences, AnnouncementStorePort store,
            NotificationRecipientDirectoryPort directory, Clock clock) {
        this.audiences = audiences;
        this.store = store;
        this.directory = directory;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public AnnouncementReach reach(AnnouncementKind kind, AnnouncementAudience audience) {
        return audiences.count(audience, kind.promotional());
    }

    @Override
    @Transactional
    public AnnouncementRecord send(Announcement announcement, UUID adminId, UUID requestId) {
        if (Objects.nonNull(requestId)) {
            Optional<AnnouncementRecord> repeated = store.find(requestId);
            if (repeated.isPresent()) {
                return firstSend(repeated.get());
            }
        }
        String email = directory.findUser(adminId).map(user -> user.recipient().email())
                .orElseThrow(() -> new DomainException("ADMIN_NOT_FOUND", "The administrator account was not found"));
        int recipients = audiences.count(announcement.audience(), announcement.kind().promotional()).accounts();
        if (recipients == 0) {
            throw new DomainException("ANNOUNCEMENT_AUDIENCE_EMPTY", "No account matches this audience");
        }
        UUID id = Objects.requireNonNullElseGet(requestId, UUID::randomUUID);
        Instant at = clock.instant();
        if (!store.save(id, announcement, false, recipients, new AnnouncementStorePort.Sender(adminId, email), at)) {
            return firstSend(store.find(id).orElseThrow(() -> new IllegalStateException("Announcement " + id + " vanished")));
        }
        return new AnnouncementRecord(id, announcement.kind(), false, announcement.audience(), announcement.destination(),
                announcement.headline(), recipients, email, at, null);
    }

    /** A repeated request gets the send it already made; an id a test used is never a send. */
    private static AnnouncementRecord firstSend(AnnouncementRecord existing) {
        if (existing.test()) {
            throw new DomainException("ANNOUNCEMENT_REQUEST_CONFLICT", "This request id was already used by a test");
        }
        return existing;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnnouncementRecord> history() {
        return store.recent(HISTORY_SIZE);
    }

    @Override
    @Transactional(readOnly = true)
    public AnnouncementRecord find(UUID id) {
        return store.find(id).orElseThrow(() -> new EntityNotFoundException("Announcement", id));
    }
}
