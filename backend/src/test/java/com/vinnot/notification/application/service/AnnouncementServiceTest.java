package com.vinnot.notification.application.service;

import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushPlatform;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.notification.domain.model.PushToken;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.application.port.out.NotificationRendererPort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnnouncementServiceTest {
    private final NotificationRendererPort emails = mock(NotificationRendererPort.class);
    private final PushRendererPort pushes = mock(PushRendererPort.class);
    private final NotificationRecipientDirectoryPort directory = mock(NotificationRecipientDirectoryPort.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final PushNotificationPort pushNotifications = mock(PushNotificationPort.class);
    private final PushDeviceRepositoryPort devices = mock(PushDeviceRepositoryPort.class);
    private final AnnouncementStorePort store = mock(AnnouncementStorePort.class);
    private final EmailSuppressionPort suppressions = mock(EmailSuppressionPort.class);
    private final Instant now = Instant.parse("2026-10-20T12:00:00Z");
    private final AnnouncementService service = new AnnouncementService(emails, pushes, directory, notifications,
            pushNotifications, devices, store, suppressions, "https://vinnot.test/", Clock.fixed(now, ZoneOffset.UTC));
    private final UUID admin = UUID.randomUUID();
    private final AnnouncementContent content = new AnnouncementContent("Vendimia", "Catas **todo el mes**.");

    @Test
    void aNewsPreviewRendersTheRealTemplatesForTheAdministratorWithAPlaceholderUnsubscribeLink() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
        when(emails.render(any())).thenReturn(new RenderedNotification("Vendimia", "text", "<html>", null));
        when(pushes.render(NotificationType.NEWSLETTER, NotificationLocale.EN, Map.of(NotificationType.SUBJECT, "Vendimia",
                NotificationType.BODY, "Catas **todo el mes**."))).thenReturn(new PushContent("Vendimia", "Catas todo el mes.", "/"));

        var preview = service.preview(AnnouncementKind.NEWS, NotificationLocale.EN, content, admin);

        var rendered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(emails).render(rendered.capture());
        assertThat(rendered.getValue().type()).isEqualTo(NotificationType.NEWSLETTER);
        assertThat(rendered.getValue().locale()).isEqualTo(NotificationLocale.EN);
        assertThat(rendered.getValue().recipient().email()).isEqualTo("admin@vinnot.test");
        assertThat(rendered.getValue().data()).containsEntry(NotificationType.UNSUBSCRIBE_URL, "https://vinnot.test/unsubscribe");
        assertThat(preview.html()).isEqualTo("<html>");
        assertThat(preview.pushBody()).isEqualTo("Catas todo el mes.");
    }

    @Test
    void aServiceNoticePreviewHasNoUnsubscribeLinkAndAnUnknownAdministratorIsRefused() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
        when(emails.render(any())).thenReturn(new RenderedNotification("Vendimia", "text", "<html>", null));
        when(pushes.render(any(), any(), any())).thenReturn(new PushContent("Vendimia", "Catas todo el mes.", "/"));

        service.preview(AnnouncementKind.SERVICE, NotificationLocale.ES, content, admin);

        var rendered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(emails).render(rendered.capture());
        assertThat(rendered.getValue().type()).isEqualTo(NotificationType.SERVICE_NOTICE);
        assertThat(rendered.getValue().data()).doesNotContainKey(NotificationType.UNSUBSCRIBE_URL);
        when(directory.findUser(admin)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.preview(AnnouncementKind.SERVICE, NotificationLocale.ES, content, admin))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "ADMIN_NOT_FOUND");
    }

    @Test
    void aTestSendsEveryWrittenVersionToTheAdministratorOnlyAndIsAudited() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
        when(devices.findByUsers(List.of(admin))).thenReturn(List.of(new PushDevice(admin, new PushToken("ExponentPushToken[a]"),
                PushPlatform.IOS, NotificationLocale.ES, now)));
        Announcement announcement = new Announcement(AnnouncementKind.NEWS, Map.of(NotificationLocale.ES, content,
                NotificationLocale.EN, new AnnouncementContent("Harvest", "Tastings.")),
                new AnnouncementAudience(true, true, "es", null, null, null), AnnouncementDestination.EVENTS);

        AnnouncementReach reached = service.sendTest(announcement, admin);

        assertThat(reached).isEqualTo(new AnnouncementReach(1, 1, 1));
        var emailed = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(emailed.capture());
        assertThat(emailed.getAllValues()).allSatisfy(request -> {
            assertThat(request.type()).isEqualTo(NotificationType.ANNOUNCEMENT_TEST);
            assertThat(request.recipient()).isEqualTo(NotificationRecipient.user(admin));
            assertThat(request.data()).containsEntry(NotificationType.KIND, "NEWS")
                    .containsEntry(NotificationType.UNSUBSCRIBE_URL, "https://vinnot.test/unsubscribe")
                    .containsEntry(NotificationType.ROUTE, "/events");
        });
        assertThat(emailed.getAllValues()).extracting(NotificationRequest::locale)
                .containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
        var pushed = ArgumentCaptor.forClass(PushRequest.class);
        verify(pushNotifications, times(2)).push(pushed.capture());
        assertThat(pushed.getAllValues()).allSatisfy(request -> {
            assertThat(request.userIds()).containsExactly(admin);
            assertThat(request.type()).isEqualTo(NotificationType.ANNOUNCEMENT_TEST);
        });
        verify(store).save(any(), eq(announcement), eq(true), eq(1),
                eq(new AnnouncementStorePort.Sender(admin, "admin@vinnot.test")), eq(now));
    }

    @Test
    void withoutADeviceTheTestGoesByEmailOnlyAndAPushOnlyTestWithoutDeviceReachesNothingByPush() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
        when(devices.findByUsers(List.of(admin))).thenReturn(List.of());
        Announcement service = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.ES, content),
                new AnnouncementAudience(true, true, null, null, null, null), AnnouncementDestination.HOME);

        assertThat(this.service.sendTest(service, admin)).isEqualTo(new AnnouncementReach(1, 0, 1));

        var emailed = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(emailed.capture());
        assertThat(emailed.getValue().data()).doesNotContainKey(NotificationType.UNSUBSCRIBE_URL)
                .containsEntry(NotificationType.KIND, "SERVICE");
        verify(pushNotifications, never()).push(any());
    }

    @Test
    void aSuppressedAddressGetsTheTestByPushOnlyAndATestThatReachesNothingIsRefused() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Ana"), NotificationLocale.ES)));
        when(suppressions.isSuppressed("admin@vinnot.test")).thenReturn(true);
        when(devices.findByUsers(List.of(admin))).thenReturn(List.of(new PushDevice(admin, new PushToken("ExponentPushToken[a]"),
                PushPlatform.IOS, NotificationLocale.ES, now)));
        Announcement both = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.ES, content),
                new AnnouncementAudience(true, true, null, null, null, null), AnnouncementDestination.HOME);

        assertThat(service.sendTest(both, admin)).isEqualTo(new AnnouncementReach(0, 1, 1));
        verify(notifications, never()).enqueue(any());

        Announcement emailOnly = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.ES, content),
                new AnnouncementAudience(true, false, null, null, null, null), AnnouncementDestination.HOME);
        assertThatThrownBy(() -> service.sendTest(emailOnly, admin)).isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_TEST_UNREACHABLE");
        verify(store).save(any(), eq(both), eq(true), eq(1), any(), eq(now));
        verify(store, never()).save(any(), eq(emailOnly), anyBoolean(), anyInt(), any(), any());
    }

    @Test
    void theTitleMustFitOnOneLine() {
        assertThatThrownBy(() -> new AnnouncementContent(" ", "Body")).hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_TITLE");
        assertThatThrownBy(() -> new AnnouncementContent("a\nb", "Body")).hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_TITLE");
        assertThatThrownBy(() -> new AnnouncementContent("x".repeat(121), "Body"))
                .hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_TITLE");
        assertThat(new AnnouncementContent("  Vendimia ", " Body ").title()).isEqualTo("Vendimia");
    }
}
