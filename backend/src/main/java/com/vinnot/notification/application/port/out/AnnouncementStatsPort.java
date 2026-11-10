package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.AnnouncementRef;

import java.util.UUID;

/**
 * Per-announcement delivery counters (#490). Every count is an atomic increment, so concurrent jobs and receipt checks
 * never lose one. A count for an announcement that does not exist is ignored.
 */
public interface AnnouncementStatsPort {
    /** Adds emails sent and failed; kept even if the calling job later fails. */
    void recordEmail(UUID announcementId, int sent, int failed);

    /** Adds accounts a push reached and push messages that failed; kept even if the calling job later fails. */
    void recordPush(UUID announcementId, int sent, int failed);

    /**
     * Counts an opened push in the caller's transaction, once per account and announcement: an account that already
     * opened another push ref of the same announcement is not counted again. {@code openedRef} is the ref just stored.
     */
    void recordPushOpen(AnnouncementRef announcement, UUID userId, String openedRef);
}
