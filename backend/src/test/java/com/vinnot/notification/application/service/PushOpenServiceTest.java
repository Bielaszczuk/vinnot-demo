package com.vinnot.notification.application.service;

import com.vinnot.activity.application.command.model.RecordAppOpenCommand;
import com.vinnot.activity.application.port.in.RecordAppOpenUseCase;
import com.vinnot.notification.application.model.PushOpen;
import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.PushOpenStorePort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PushOpenServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-20T21:00:00Z");
    private final UUID user = UUID.randomUUID();
    private final PushOpenStorePort store = mock(PushOpenStorePort.class);
    private final RecordAppOpenUseCase appOpens = mock(RecordAppOpenUseCase.class);
    private final AnnouncementStatsPort announcementStats = mock(AnnouncementStatsPort.class);
    private final PushOpenService service = new PushOpenService(store, appOpens, announcementStats,
            Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void recordsTheOpenOncePerRefAndEveryOpenCountsAsAnAppOpen() {
        when(store.save(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION, NOW)).thenReturn(true, false);

        service.record(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION);
        service.record(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION);

        verify(store, times(2)).save(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION, NOW);
        verify(appOpens, times(2)).execute(new RecordAppOpenCommand(user));
    }

    @Test
    void aRefMustBePresentAndAtMost180Characters() {
        for (String ref : new String[]{null, " ", "x".repeat(181)}) {
            assertThatThrownBy(() -> service.record(user, ref, NotificationType.EVENT_NEARBY))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "INVALID_PUSH_REF");
        }
        assertThatThrownBy(() -> service.record(user, "ref", null)).isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_PUSH_REF");

        verifyNoInteractions(store, appOpens);
        service.record(user, "x".repeat(180), NotificationType.EVENT_NEARBY);
        verify(store).save(user, "x".repeat(180), NotificationType.EVENT_NEARBY, NOW);
    }

    @Test
    void readsOpensPerUserAndTypeAndCountsPerType() {
        Instant since = NOW.minusSeconds(86_400);
        var open = new PushOpen(user, "event-nearby:2", NotificationType.EVENT_NEARBY, NOW);
        Set<NotificationType> types = Set.of(NotificationType.EVENT_NEARBY);
        when(store.findSince(List.of(user), types, since)).thenReturn(List.of(open));
        when(store.countByTypeSince(since)).thenReturn(Map.of(NotificationType.EVENT_NEARBY, 4L));

        assertThat(service.opensSince(List.of(user), types, since)).containsExactly(open);
        assertThat(service.openCountsSince(since)).containsExactlyEntriesOf(Map.of(NotificationType.EVENT_NEARBY, 4L));
        assertThat(service.opensSince(List.of(), types, since)).isEmpty();
        assertThat(service.opensSince(List.of(user), Set.of(), since)).isEmpty();
        verify(store).findSince(List.of(user), types, since);
    }

    @Test
    void theFirstOpenOfAnAnnouncementPushCountsAgainstItsAnnouncement() {
        UUID announcement = UUID.randomUUID();
        String ref = AnnouncementRef.push(announcement, NotificationLocale.ES, user) + ":quiet:1761000000";
        when(store.save(user, ref, NotificationType.NEWSLETTER, NOW)).thenReturn(true, false);

        service.record(user, ref, NotificationType.NEWSLETTER);
        service.record(user, ref, NotificationType.NEWSLETTER);

        verify(announcementStats).recordPushOpen(new AnnouncementRef(announcement, "announcement:" + announcement + ":"),
                user, ref);
        verifyNoMoreInteractions(announcementStats);
        verify(appOpens, times(2)).execute(new RecordAppOpenCommand(user));
    }

    @Test
    void opensOfOtherPushesOrWithAnotherTypeNeverCountAgainstAnAnnouncement() {
        String ref = AnnouncementRef.push(UUID.randomUUID(), NotificationLocale.EN, user);
        when(store.save(any(), any(), any(), any())).thenReturn(true);

        service.record(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION);
        service.record(user, ref, NotificationType.WINE_RECOMMENDATION);

        verifyNoInteractions(announcementStats);
    }
}
