package com.vinnot.admin.application.service;

import com.vinnot.admin.application.port.out.ModerationQueueDigest;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SendModerationDigestServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-20T18:15:00Z");
    /** The window ends five minutes before the run, so work still being saved at the cut-off goes to the next one. */
    private static final Instant SETTLED = NOW.minusSeconds(300);
    private static final ModerationQueueDigest.Window WINDOW = new ModerationQueueDigest.Window(NOW.minusSeconds(900), SETTLED);
    private final ModerationQueueDigest queue = mock(ModerationQueueDigest.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final SendModerationDigestService service = new SendModerationDigestService(queue, notifications);

    @Test
    void everyStaffMemberGetsOneDigestOfTheNewWork() {
        UUID admin = UUID.randomUUID();
        UUID moderator = UUID.randomUUID();
        when(queue.claim(SETTLED)).thenReturn(WINDOW);
        when(queue.newWork(WINDOW)).thenReturn(new ModerationQueueDigest.NewWork(1, 1, "Gran Malbec", "SPAM"));
        when(queue.staff()).thenReturn(List.of(admin, moderator));

        assertThat(service.execute(NOW)).isEqualTo(2);

        ArgumentCaptor<NotificationRequest> sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(sent.capture());
        assertThat(sent.getAllValues()).extracting(NotificationRequest::recipient)
                .containsExactly(NotificationRecipient.user(admin), NotificationRecipient.user(moderator));
        NotificationRequest first = sent.getAllValues().get(0);
        assertThat(first.type()).isEqualTo(NotificationType.MODERATION_QUEUE_DIGEST);
        assertThat(first.data()).isEqualTo(Map.of("submissions", "1", "reports", "1", "wineName", "Gran Malbec", "reportReason", "SPAM"));
        assertThat(first.dedupeKey()).isEqualTo("moderation-digest:" + admin + ":" + SETTLED.toEpochMilli());
    }

    @Test
    void severalItemsAreCountedAndNoNewWorkSendsNothing() {
        when(queue.claim(SETTLED)).thenReturn(WINDOW);
        when(queue.newWork(WINDOW)).thenReturn(new ModerationQueueDigest.NewWork(3, 0, null, null));
        when(queue.staff()).thenReturn(List.of(UUID.randomUUID()));
        service.execute(NOW);
        ArgumentCaptor<NotificationRequest> sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(sent.capture());
        assertThat(sent.getValue().data()).isEqualTo(Map.of("submissions", "3", "reports", "0"));

        ModerationQueueDigest quiet = mock(ModerationQueueDigest.class);
        when(quiet.claim(SETTLED)).thenReturn(WINDOW);
        when(quiet.newWork(WINDOW)).thenReturn(new ModerationQueueDigest.NewWork(0, 0, null, null));
        NotificationPort silent = mock(NotificationPort.class);
        assertThat(new SendModerationDigestService(quiet, silent).execute(NOW)).isZero();
        verify(quiet, never()).staff();
        verifyNoInteractions(silent);
    }
}
