package com.vinnot.notification.application.port.in;

import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementKind;

import java.util.List;
import java.util.UUID;

/** Sending administrators' announcements to their audience (#310) and keeping the audit of every send. */
public interface SendAnnouncementUseCase {
    /** How many accounts this kind of announcement would reach with this audience right now. */
    AnnouncementReach reach(AnnouncementKind kind, AnnouncementAudience audience);

    /**
     * Records the send; delivery then queues it in batches. An audience nobody matches is refused. An optional
     * client {@code requestId} becomes the announcement id, so a repeated request returns the first send instead of
     * sending it twice.
     */
    AnnouncementRecord send(Announcement announcement, UUID adminId, UUID requestId);

    /** The latest sends and tests, newest first, each with its delivery counts so far. */
    List<AnnouncementRecord> history();

    /** One send or test with its delivery counts so far (#490); an unknown id is not found. */
    AnnouncementRecord find(UUID id);
}
