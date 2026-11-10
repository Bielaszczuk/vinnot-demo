package com.vinnot.event.application.service;

import com.vinnot.event.application.port.in.SendOrganizerDigestsUseCase;
import com.vinnot.event.application.port.out.OrganizerActivityDigest;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Turns each due organizer digest into one push that opens their events. The digest is removed and its push queued in
 * one transaction, so a failure leaves it for the next run. The push may wait out the organizer's quiet hours. A
 * digest of an event that was cancelled meanwhile is dropped: its cancellation already reached the organizer.
 */
@Service
@RequiredArgsConstructor
public class SendOrganizerDigestsService implements SendOrganizerDigestsUseCase {
    static final int BATCH = 200;
    private final OrganizerActivityDigest digests;
    private final PushNotificationPort pushes;

    @Override
    @Transactional
    public int execute() {
        List<OrganizerActivityDigest.Due> due = digests.claimDue(BATCH);
        List<OrganizerActivityDigest.Due> active = due.stream().filter(OrganizerActivityDigest.Due::active).toList();
        for (OrganizerActivityDigest.Due digest : active) {
            pushes.push(new PushRequest(NotificationType.EVENT_REGISTRATION_ORGANIZER, List.of(digest.organizerId()),
                    Map.of("title", digest.title(), "confirmed", Integer.toString(digest.confirmed()),
                            "requested", Integer.toString(digest.requested()), "cancelled", Integer.toString(digest.cancelled())),
                    "organizer-digest:" + digest.eventId() + ":" + digest.dueAt().getEpochSecond(), true));
        }
        return active.size();
    }
}
