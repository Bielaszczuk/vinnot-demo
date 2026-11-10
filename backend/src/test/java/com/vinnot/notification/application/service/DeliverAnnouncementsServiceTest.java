package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.out.AnnouncementAudiencePort;
import com.vinnot.notification.application.port.out.AnnouncementAudiencePort.Recipient;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class DeliverAnnouncementsServiceTest {
    private final AnnouncementStorePort store = mock(AnnouncementStorePort.class);
    private final AnnouncementAudiencePort audiences = mock(AnnouncementAudiencePort.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final DeliverAnnouncementsService service = new DeliverAnnouncementsService(store, audiences, notifications, pushes);
    private final Instant now = Instant.parse("2026-10-20T12:00:00Z");
    private final UUID id = UUID.randomUUID();
    private final AnnouncementContent spanish = new AnnouncementContent("Mantenimiento", "Domingo de 2 a 4.");

    @Test
    void nothingPendingQueuesNothing() {
        when(store.lockNextPending()).thenReturn(Optional.empty());

        assertThat(service.execute(now)).isZero();
        verifyNoInteractions(audiences, notifications, pushes);
    }

    @Test
    void aBatchQueuesEachAccountInItsLanguageOnItsChannelsAndFinishesWhenTheAudienceRunsOut() {
        Announcement announcement = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.ES, spanish,
                NotificationLocale.EN, new AnnouncementContent("Maintenance", "Sunday from 2 to 4.")),
                new AnnouncementAudience(true, true, null, null, null, null), AnnouncementDestination.HOME);
        UUID after = UUID.randomUUID();
        UUID ana = UUID.randomUUID();
        UUID bob = UUID.randomUUID();
        UUID eve = UUID.randomUUID();
        when(store.lockNextPending()).thenReturn(Optional.of(new AnnouncementStorePort.Pending(id, announcement, after)));
        when(audiences.after(announcement.audience(), false, after, DeliverAnnouncementsService.BATCH_SIZE)).thenReturn(List.of(
                new Recipient(ana, NotificationLocale.ES, true, true),
                new Recipient(bob, NotificationLocale.EN, false, true),
                new Recipient(eve, NotificationLocale.EN, true, false)));

        assertThat(service.execute(now)).isEqualTo(3);

        var emailed = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(emailed.capture());
        assertThat(emailed.getAllValues()).containsExactly(
                NotificationRequest.of(NotificationType.SERVICE_NOTICE, NotificationRecipient.user(ana), NotificationLocale.ES,
                        announcement.data(spanish), "announcement:" + id + ":" + ana),
                NotificationRequest.of(NotificationType.SERVICE_NOTICE, NotificationRecipient.user(eve), NotificationLocale.EN,
                        announcement.data(announcement.versions().get(NotificationLocale.EN)), "announcement:" + id + ":" + eve));
        var pushed = ArgumentCaptor.forClass(PushRequest.class);
        verify(pushes, times(2)).push(pushed.capture());
        assertThat(pushed.getAllValues()).extracting(PushRequest::userIds).containsExactlyInAnyOrder(List.of(ana), List.of(bob));
        assertThat(pushed.getAllValues()).allSatisfy(request -> {
            assertThat(request.type()).isEqualTo(NotificationType.SERVICE_NOTICE);
            assertThat(request.urgent()).isFalse();
        });
        assertThat(pushed.getAllValues()).extracting(PushRequest::dedupeKey).containsExactlyInAnyOrder(
                "announcement:" + id + ":es:" + ana, "announcement:" + id + ":en:" + bob);
        verify(store).advance(id, eve, now);
    }

    @Test
    void aFullBatchMovesTheCursorAndKeepsTheAnnouncementPendingWithItsChosenChannelsOnly() {
        Announcement announcement = new Announcement(AnnouncementKind.NEWS, Map.of(NotificationLocale.ES, spanish),
                new AnnouncementAudience(true, false, "es", null, null, null), AnnouncementDestination.EVENTS);
        List<Recipient> full = new ArrayList<>();
        IntStream.range(0, DeliverAnnouncementsService.BATCH_SIZE)
                .forEach(index -> full.add(new Recipient(UUID.randomUUID(), NotificationLocale.EN, true, true)));
        when(store.lockNextPending()).thenReturn(Optional.of(new AnnouncementStorePort.Pending(id, announcement, null)));
        when(audiences.after(announcement.audience(), true, null, DeliverAnnouncementsService.BATCH_SIZE)).thenReturn(full);

        assertThat(service.execute(now)).isEqualTo(DeliverAnnouncementsService.BATCH_SIZE);

        verify(notifications, times(DeliverAnnouncementsService.BATCH_SIZE)).enqueue(any());
        verify(pushes, never()).push(any());
        verify(store).advance(id, full.get(full.size() - 1).userId(), null);
    }

    @Test
    void anExhaustedAudienceCompletesWithoutMovingTheCursor() {
        Announcement announcement = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.ES, spanish),
                new AnnouncementAudience(false, true, null, null, null, null), AnnouncementDestination.HOME);
        UUID last = UUID.randomUUID();
        when(store.lockNextPending()).thenReturn(Optional.of(new AnnouncementStorePort.Pending(id, announcement, last)));
        when(audiences.after(announcement.audience(), false, last, DeliverAnnouncementsService.BATCH_SIZE)).thenReturn(List.of());

        assertThat(service.execute(now)).isZero();
        verify(store).advance(id, last, now);
        verifyNoInteractions(notifications, pushes);
    }
}
