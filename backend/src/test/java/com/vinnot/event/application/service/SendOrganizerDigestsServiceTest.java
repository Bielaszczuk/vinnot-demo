package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.OrganizerActivityDigest;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SendOrganizerDigestsServiceTest {
    private final OrganizerActivityDigest digests = mock(OrganizerActivityDigest.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final SendOrganizerDigestsService service = new SendOrganizerDigestsService(digests, pushes);

    @Test
    void eachDueDigestBecomesOneDeferrablePushToItsOrganizerKeyedByItsWindow() {
        UUID event = UUID.randomUUID();
        UUID organizer = UUID.randomUUID();
        Instant due = Instant.parse("2026-10-20T12:15:00Z");
        when(digests.claimDue(200)).thenReturn(List.of(new OrganizerActivityDigest.Due(event, organizer, "Cata", 3, 1, 0, due, true),
                new OrganizerActivityDigest.Due(UUID.randomUUID(), organizer, "Cancelled", 1, 0, 0, due, false)));

        assertThat(service.execute()).isOne();

        verify(pushes).push(new PushRequest(NotificationType.EVENT_REGISTRATION_ORGANIZER, List.of(organizer),
                Map.of("title", "Cata", "confirmed", "3", "requested", "1", "cancelled", "0"),
                "organizer-digest:" + event + ":" + due.getEpochSecond(), true));
    }

    @Test
    void nothingDuePushesNothing() {
        when(digests.claimDue(200)).thenReturn(List.of());
        assertThat(service.execute()).isZero();
        verifyNoInteractions(pushes);
    }
}
