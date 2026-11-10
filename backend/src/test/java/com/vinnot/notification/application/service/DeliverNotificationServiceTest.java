package com.vinnot.notification.application.service;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort.DirectoryUser;
import com.vinnot.notification.application.port.out.NotificationRendererPort;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.UnsubscribeLinkPort;
import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

class DeliverNotificationServiceTest {
    private final NotificationRecipientDirectoryPort directory = mock(NotificationRecipientDirectoryPort.class);
    private final NotificationRendererPort renderer = mock(NotificationRendererPort.class);
    private final NotificationDeliveryPort delivery = mock(NotificationDeliveryPort.class);
    private final NotificationPreferenceRepositoryPort preferences = mock(NotificationPreferenceRepositoryPort.class);
    private final UnsubscribeLinkPort links = mock(UnsubscribeLinkPort.class);
    private final EmailSuppressionPort suppressions = mock(EmailSuppressionPort.class);
    private final AnnouncementStatsPort announcementStats = mock(AnnouncementStatsPort.class);
    private final DeliverNotificationService service =
            new DeliverNotificationService(directory, renderer, delivery, preferences, links, suppressions, announcementStats);
    private final RenderedNotification message = new RenderedNotification("Subject", "Text", "<p>Html</p>");

    @Test
    void rendersAndSendsAddressedNotificationsWithoutALookup() {
        var request = request(NotificationRecipient.address("support@example.test", null));
        when(renderer.render(request)).thenReturn(message);
        service.deliver(request);
        verify(delivery).send(NotificationType.SUPPORT_REQUEST, "support@example.test", message);
        verifyNoInteractions(directory);
    }

    @Test
    void skipsASuppressedAddressWithoutRenderingOrSending() {
        var request = request(NotificationRecipient.address("bounced@example.test", null));
        when(suppressions.isSuppressed("bounced@example.test")).thenReturn(true);
        service.deliver(request);
        verifyNoInteractions(renderer, delivery);
    }

    @Test
    void skipsASuppressedUserAddressEvenForTransactionalMailAndIssuesNoUnsubscribeLink() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(new DirectoryUser(
                NotificationRecipient.address("complained@example.test", "Ana"), NotificationLocale.EN)));
        when(suppressions.isSuppressed("complained@example.test")).thenReturn(true);
        service.deliver(NotificationRequest.of(NotificationType.ACCOUNT_PASSWORD_RESET, NotificationRecipient.user(userId),
                NotificationLocale.EN, Map.of(NotificationType.ACTION_URL, "https://vinnot.test/reset"), "reset:1"));
        verifyNoInteractions(renderer, delivery, links);
    }

    @Test
    void resolvesUsersAtDeliveryTimeAndRendersWithTheirCurrentName() {
        UUID userId = UUID.randomUUID();
        var current = NotificationRecipient.address("current@example.test", "Ana");
        when(directory.findUser(userId)).thenReturn(Optional.of(new DirectoryUser(current, NotificationLocale.EN)));
        when(renderer.render(any())).thenReturn(message);
        service.deliver(request(NotificationRecipient.user(userId)));
        var rendered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(renderer).render(rendered.capture());
        assertThat(rendered.getValue().recipient()).isEqualTo(current);
        verify(delivery).send(NotificationType.SUPPORT_REQUEST, "current@example.test", message);
    }

    @Test
    void rendersUserNotificationsInTheirCurrentPreferredLanguage() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(
                new DirectoryUser(NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(renderer.render(any())).thenReturn(message);
        var request = request(NotificationRecipient.user(userId));
        service.deliver(request);
        var rendered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(renderer).render(rendered.capture());
        assertThat(rendered.getValue().locale()).isEqualTo(NotificationLocale.ES);
        assertThat(rendered.getValue().data()).isEqualTo(request.data());
        assertThat(rendered.getValue().dedupeKey()).isEqualTo(request.dedupeKey());
        assertThat(rendered.getValue().category()).isEqualTo(request.category());
    }

    @Test
    void keepsTheRequestedLocaleWhenTheUserHasNoStoredLanguage() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(
                new DirectoryUser(NotificationRecipient.address("ana@example.test", "Ana"), null)));
        when(renderer.render(any())).thenReturn(message);
        service.deliver(request(NotificationRecipient.user(userId)));
        var rendered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(renderer).render(rendered.capture());
        assertThat(rendered.getValue().locale()).isEqualTo(NotificationLocale.EN);
    }

    @Test
    void anAnnouncementKeepsTheLanguageOfTheVersionItCarries() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(
                new DirectoryUser(NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.EN)));
        when(renderer.render(any())).thenReturn(message);
        service.deliver(NotificationRequest.of(NotificationType.SERVICE_NOTICE, NotificationRecipient.user(userId),
                NotificationLocale.ES, Map.of(NotificationType.SUBJECT, "Mantenimiento", NotificationType.BODY, "Domingo."),
                "announcement:1:" + userId));
        var rendered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(renderer).render(rendered.capture());
        assertThat(rendered.getValue().locale()).isEqualTo(NotificationLocale.ES);
        assertThat(rendered.getValue().recipient().email()).isEqualTo("ana@example.test");
    }

    @Test
    void addressedNotificationsKeepTheirRequestedLocale() {
        var request = NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address("support@example.test", null), NotificationLocale.ES, Map.of(), "support:2");
        when(renderer.render(request)).thenReturn(message);
        service.deliver(request);
        verify(renderer).render(request);
        verifyNoInteractions(directory);
    }

    @Test
    void dropsNotificationsForUsersThatNoLongerExist() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.empty());
        service.deliver(request(NotificationRecipient.user(userId)));
        verifyNoInteractions(renderer, delivery);
    }

    @Test
    void propagatesDeliveryFailuresSoTheOutboxRetries() {
        var request = request(NotificationRecipient.address("support@example.test", null));
        when(renderer.render(request)).thenReturn(message);
        doThrow(new IllegalStateException("down")).when(delivery).send(any(), any(), any());
        assertThatThrownBy(() -> service.deliver(request)).hasMessage("down");
    }

    @Test
    void transactionalNotificationsNeverReadPreferences() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(
                new DirectoryUser(NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(renderer.render(any())).thenReturn(message);

        service.deliver(request(NotificationRecipient.user(userId)));

        verify(delivery).send(NotificationType.SUPPORT_REQUEST, "ana@example.test", message);
        verifyNoInteractions(preferences, links);
    }

    @Test
    void skipsAnOptionalNotificationTheUserTurnedOffForEmail() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(
                new DirectoryUser(NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(preferences.load(userId)).thenReturn(new NotificationPreferences(Map.of(
                new NotificationPreferences.Choice(NotificationCategory.NEWSLETTER, NotificationChannel.EMAIL), false),
                new MarketingConsent(true, Instant.now(), ConsentSource.WEB)));

        service.deliver(newsletter(userId));

        verifyNoInteractions(delivery, renderer, links);
    }

    @Test
    void skipsPromotionAfterMarketingConsentIsRevokedEvenWhenTheCategoryIsOn() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(
                new DirectoryUser(NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(preferences.load(userId)).thenReturn(new NotificationPreferences(Map.of(
                new NotificationPreferences.Choice(NotificationCategory.NEWSLETTER, NotificationChannel.EMAIL), true),
                new MarketingConsent(false, Instant.now(), ConsentSource.MOBILE)));

        service.deliver(newsletter(userId));

        verifyNoInteractions(delivery);
    }

    @Test
    void promotionalEmailsCarryTheUnsubscribePageAndOneClickHeaders() {
        UUID userId = UUID.randomUUID();
        when(directory.findUser(userId)).thenReturn(Optional.of(
                new DirectoryUser(NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(preferences.load(userId)).thenReturn(new NotificationPreferences(Map.of(
                new NotificationPreferences.Choice(NotificationCategory.NEWSLETTER, NotificationChannel.EMAIL), true),
                new MarketingConsent(true, Instant.now(), ConsentSource.WEB)));
        when(links.issue(userId, NotificationCategory.NEWSLETTER)).thenReturn(new UnsubscribeLinkPort.UnsubscribeLink(
                "https://vinnot.test/unsubscribe?token=t", "https://api.vinnot.test/api/notifications/unsubscribe?token=t"));
        when(renderer.render(any())).thenReturn(message);

        service.deliver(newsletter(userId));

        var rendered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(renderer).render(rendered.capture());
        assertThat(rendered.getValue().data()).containsEntry(NotificationType.UNSUBSCRIBE_URL,
                "https://vinnot.test/unsubscribe?token=t");
        var sent = ArgumentCaptor.forClass(RenderedNotification.class);
        verify(delivery).send(eq(NotificationType.NEWSLETTER),
                eq("ana@example.test"), sent.capture());
        assertThat(sent.getValue().headers()).containsExactlyEntriesOf(Map.of(
                "List-Unsubscribe", "<https://api.vinnot.test/api/notifications/unsubscribe?token=t>",
                "List-Unsubscribe-Post", "List-Unsubscribe=One-Click"));
    }

    private NotificationRequest newsletter(UUID userId) {
        return NotificationRequest.of(NotificationType.NEWSLETTER, NotificationRecipient.user(userId), NotificationLocale.ES,
                Map.of(NotificationType.SUBJECT, "Novedades", NotificationType.BODY, "Hola"), "newsletter:1");
    }

    private NotificationRequest request(NotificationRecipient recipient) {
        return NotificationRequest.of(NotificationType.SUPPORT_REQUEST, recipient, NotificationLocale.EN, Map.of(), "support:1");
    }

    @Test
    void anAnnouncementEmailCountsAsSentOnceTheProviderAcceptsItAndAsFailedWhenItsAddressIsSuppressed() {
        UUID announcement = UUID.randomUUID();
        UUID ana = UUID.randomUUID();
        UUID bruno = UUID.randomUUID();
        when(directory.findUser(ana)).thenReturn(Optional.of(new DirectoryUser(
                NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(directory.findUser(bruno)).thenReturn(Optional.of(new DirectoryUser(
                NotificationRecipient.address("bruno@example.test", "Bruno"), NotificationLocale.ES)));
        when(suppressions.isSuppressed("bruno@example.test")).thenReturn(true);
        when(renderer.render(any())).thenReturn(message);

        service.deliver(announcementEmail(announcement, ana));
        service.deliver(announcementEmail(announcement, bruno));

        verify(delivery).send(NotificationType.SERVICE_NOTICE, "ana@example.test", message);
        verify(announcementStats).recordEmail(announcement, 1, 0);
        verify(announcementStats).recordEmail(announcement, 0, 1);
    }

    @Test
    void aRefusedAnnouncementEmailIsNotCountedUntilTheOutboxGivesUpOnIt() {
        UUID announcement = UUID.randomUUID();
        UUID ana = UUID.randomUUID();
        when(directory.findUser(ana)).thenReturn(Optional.of(new DirectoryUser(
                NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(renderer.render(any())).thenReturn(message);
        doThrow(new IllegalStateException("provider down")).when(delivery).send(any(), any(), any());
        var request = announcementEmail(announcement, ana);

        assertThatThrownBy(() -> service.deliver(request)).hasMessage("provider down");
        verifyNoInteractions(announcementStats);

        service.gaveUp(request);
        verify(announcementStats).recordEmail(announcement, 0, 1);
    }

    @Test
    void aCountingFailureNeverFailsTheEmailAndOtherEmailsAreNeverCounted() {
        UUID ana = UUID.randomUUID();
        UUID announcement = UUID.randomUUID();
        when(directory.findUser(ana)).thenReturn(Optional.of(new DirectoryUser(
                NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES)));
        when(renderer.render(any())).thenReturn(message);
        doThrow(new IllegalStateException("stats down")).when(announcementStats).recordEmail(any(), anyInt(), anyInt());

        service.deliver(announcementEmail(announcement, ana));
        service.deliver(NotificationRequest.of(NotificationType.ACCOUNT_PASSWORD_RESET, NotificationRecipient.user(ana),
                NotificationLocale.ES, Map.of(NotificationType.ACTION_URL, "https://vinnot.test/reset"), "reset:1"));
        service.gaveUp(NotificationRequest.of(NotificationType.ACCOUNT_PASSWORD_RESET, NotificationRecipient.user(ana),
                NotificationLocale.ES, Map.of(NotificationType.ACTION_URL, "https://vinnot.test/reset"), "reset:1"));

        verify(delivery).send(NotificationType.SERVICE_NOTICE, "ana@example.test", message);
        verify(delivery).send(NotificationType.ACCOUNT_PASSWORD_RESET, "ana@example.test", message);
        verify(announcementStats).recordEmail(announcement, 1, 0);
        verifyNoMoreInteractions(announcementStats);
    }

    private static NotificationRequest announcementEmail(UUID announcement, UUID user) {
        return NotificationRequest.of(NotificationType.SERVICE_NOTICE, NotificationRecipient.user(user), NotificationLocale.ES,
                Map.of(NotificationType.SUBJECT, "Maintenance", NotificationType.BODY, "Sunday."),
                AnnouncementRef.email(announcement, user));
    }
}
