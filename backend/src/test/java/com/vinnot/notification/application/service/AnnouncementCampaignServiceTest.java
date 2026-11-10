package com.vinnot.notification.application.service;

import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.application.model.AnnouncementStats;
import com.vinnot.notification.application.port.out.AnnouncementAudiencePort;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnnouncementCampaignServiceTest {
    private final AnnouncementAudiencePort audiences = mock(AnnouncementAudiencePort.class);
    private final AnnouncementStorePort store = mock(AnnouncementStorePort.class);
    private final NotificationRecipientDirectoryPort directory = mock(NotificationRecipientDirectoryPort.class);
    private final Instant now = Instant.parse("2026-10-20T12:00:00Z");
    private final AnnouncementCampaignService service = new AnnouncementCampaignService(audiences, store, directory,
            Clock.fixed(now, ZoneOffset.UTC));
    private final UUID admin = UUID.randomUUID();
    private final AnnouncementAudience partners = new AnnouncementAudience(true, false, null, null, null, "PARTNER");
    private final Announcement news = new Announcement(AnnouncementKind.NEWS,
            Map.of(NotificationLocale.EN, new AnnouncementContent("Harvest", "Tastings.")), partners, AnnouncementDestination.WINES);

    @Test
    void theReachOfPromotionalNewsCountsOnlyConsentingAccounts() {
        when(audiences.count(partners, true)).thenReturn(new AnnouncementReach(4, 0, 4));

        assertThat(service.reach(AnnouncementKind.NEWS, partners)).isEqualTo(new AnnouncementReach(4, 0, 4));
        verify(audiences).count(partners, true);
    }

    @Test
    void aSendIsAuditedWithItsSenderAndTheAccountsItReaches() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
        when(audiences.count(partners, true)).thenReturn(new AnnouncementReach(4, 0, 4));
        when(store.save(any(), eq(news), eq(false), eq(4), any(), eq(now))).thenReturn(true);

        AnnouncementRecord sent = service.send(news, admin, null);

        verify(store).save(eq(sent.id()), eq(news), eq(false), eq(4),
                eq(new AnnouncementStorePort.Sender(admin, "admin@vinnot.test")), eq(now));
        assertThat(sent).isEqualTo(new AnnouncementRecord(sent.id(), AnnouncementKind.NEWS, false, partners,
                AnnouncementDestination.WINES, "Harvest", 4, "admin@vinnot.test", now, null));
    }

    @Test
    void anAudienceNobodyMatchesOrAnUnknownAdministratorIsRefused() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
        when(audiences.count(partners, true)).thenReturn(new AnnouncementReach(0, 0, 0));

        assertThatThrownBy(() -> service.send(news, admin, null)).isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_AUDIENCE_EMPTY");
        when(directory.findUser(admin)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.send(news, admin, null)).hasFieldOrPropertyWithValue("code", "ADMIN_NOT_FOUND");
        verify(store, never()).save(any(), any(), anyBoolean(), anyInt(), any(), any());
    }

    @Test
    void theClientRequestIdBecomesTheAnnouncementId() {
        UUID requestId = UUID.randomUUID();
        admin();
        when(audiences.count(partners, true)).thenReturn(new AnnouncementReach(4, 0, 4));
        when(store.save(eq(requestId), eq(news), eq(false), eq(4), any(), eq(now))).thenReturn(true);

        assertThat(service.send(news, admin, requestId).id()).isEqualTo(requestId);
    }

    @Test
    void aRepeatedRequestReturnsTheFirstSendWithoutRecordingASecondOne() {
        UUID requestId = UUID.randomUUID();
        AnnouncementRecord first = record(requestId, false);
        when(store.find(requestId)).thenReturn(Optional.of(first));

        assertThat(service.send(news, admin, requestId)).isEqualTo(first);
        verify(store, never()).save(any(), any(), anyBoolean(), anyInt(), any(), any());
        verify(audiences, never()).count(any(), anyBoolean());
    }

    @Test
    void aConcurrentDuplicateThatLosesTheInsertReturnsTheWinner() {
        UUID requestId = UUID.randomUUID();
        AnnouncementRecord winner = record(requestId, false);
        admin();
        when(audiences.count(partners, true)).thenReturn(new AnnouncementReach(4, 0, 4));
        when(store.find(requestId)).thenReturn(Optional.empty(), Optional.of(winner));
        when(store.save(eq(requestId), eq(news), eq(false), eq(4), any(), eq(now))).thenReturn(false);

        assertThat(service.send(news, admin, requestId)).isEqualTo(winner);
    }

    @Test
    void aLostInsertWhoseWinnerCannotBeReadFailsInsteadOfReportingASend() {
        UUID requestId = UUID.randomUUID();
        admin();
        when(audiences.count(partners, true)).thenReturn(new AnnouncementReach(4, 0, 4));
        when(store.find(requestId)).thenReturn(Optional.empty());
        when(store.save(eq(requestId), eq(news), eq(false), eq(4), any(), eq(now))).thenReturn(false);

        assertThatThrownBy(() -> service.send(news, admin, requestId)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aRequestIdAlreadyUsedByATestIsRefused() {
        UUID requestId = UUID.randomUUID();
        when(store.find(requestId)).thenReturn(Optional.of(record(requestId, true)));

        assertThatThrownBy(() -> service.send(news, admin, requestId)).isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_REQUEST_CONFLICT");
        verify(store, never()).save(any(), any(), anyBoolean(), anyInt(), any(), any());
    }

    private void admin() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
    }

    private AnnouncementRecord record(UUID id, boolean test) {
        return new AnnouncementRecord(id, AnnouncementKind.NEWS, test, partners, AnnouncementDestination.WINES, "Harvest", 4,
                "admin@vinnot.test", now, null);
    }

    @Test
    void theHistoryListsTheLatestSends() {
        List<AnnouncementRecord> recent = List.of(new AnnouncementRecord(UUID.randomUUID(), AnnouncementKind.SERVICE, true,
                partners, AnnouncementDestination.HOME, "Maintenance", 1, "admin@vinnot.test", now, now));
        when(store.recent(AnnouncementCampaignService.HISTORY_SIZE)).thenReturn(recent);

        assertThat(service.history()).isEqualTo(recent);
    }

    @Test
    void oneSendIsFoundWithItsStatsAndAnUnknownIdIsNotFound() {
        UUID id = UUID.randomUUID();
        AnnouncementRecord sent = new AnnouncementRecord(id, AnnouncementKind.NEWS, false, partners,
                AnnouncementDestination.HOME, "Vendimia", 12, "admin@vinnot.test", now, null,
                new AnnouncementStats(10, 1, 8, 2, 3));
        when(store.find(id)).thenReturn(Optional.of(sent));

        assertThat(service.find(id)).isEqualTo(sent);
        assertThatThrownBy(() -> service.find(UUID.randomUUID())).isInstanceOf(EntityNotFoundException.class)
                .hasFieldOrPropertyWithValue("code", "NOT_FOUND");
    }
}
