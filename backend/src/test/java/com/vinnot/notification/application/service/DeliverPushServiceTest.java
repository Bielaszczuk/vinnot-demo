package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.EngagementBudgetPort;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.PushAudiencePort;
import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.application.port.out.PushMetricsPort;
import com.vinnot.notification.application.port.out.PushOutboxPort;
import com.vinnot.notification.application.port.out.PushReceiptStorePort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.application.port.out.PushSendLogPort;
import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import com.vinnot.notification.domain.model.PushOutcome;
import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushPlatform;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.notification.domain.model.PushToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.invocation.InvocationOnMock;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.function.UnaryOperator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;
import com.vinnot.notification.domain.model.ConsentSource;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class DeliverPushServiceTest {
    /** 15:00 in Buenos Aires: not quiet there. */
    private static final Instant DAYTIME = Instant.parse("2026-10-21T18:00:00Z");
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final PushContent CONTENT = new PushContent("Title", "Body", "/events");
    private final PushAudiencePort audience = mock(PushAudiencePort.class);
    private final NotificationPreferenceRepositoryPort preferences = mock(NotificationPreferenceRepositoryPort.class);
    private final PushDeviceRepositoryPort devices = mock(PushDeviceRepositoryPort.class);
    private final PushRendererPort renderer = mock(PushRendererPort.class);
    private final PushSenderPort sender = mock(PushSenderPort.class);
    private final PushSendLogPort sendLog = mock(PushSendLogPort.class);
    private final PushReceiptStorePort receipts = mock(PushReceiptStorePort.class);
    private final PushOutboxPort outbox = mock(PushOutboxPort.class);
    private final PushTypeSwitchPort switches = mock(PushTypeSwitchPort.class);
    private final PushMetricsPort metrics = mock(PushMetricsPort.class);
    private final EngagementBudgetPort engagement = mock(EngagementBudgetPort.class);
    private final AnnouncementStatsPort announcementStats = mock(AnnouncementStatsPort.class);
    private final UUID ana = UUID.randomUUID();
    private final UUID bruno = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        when(renderer.render(any(), any(), any())).thenReturn(CONTENT);
        when(sender.send(anyList())).thenAnswer(call -> ((List<PushSenderPort.Message>) call.getArgument(0)).stream()
                .map(message -> new PushSenderPort.Ticket(message.token(), "ticket-" + message.token(), null)).toList());
        when(preferences.load(any())).thenReturn(newsletter(false, true));
        when(switches.isEnabled(any())).thenReturn(true);
        when(preferences.loadAll(anyCollection())).thenAnswer(call -> {
            Map<UUID, NotificationPreferences> loaded = new HashMap<>();
            ((Collection<UUID>) call.getArgument(0)).forEach(id -> loaded.put(id, preferences.load(id)));
            return loaded;
        });
        when(sendLog.reserve(any(), anyList(), any(), anyBoolean(), any(), any())).thenAnswer(call ->
                ((UnaryOperator<List<UUID>>) call.getArgument(5)).apply(call.getArgument(1)));
        when(engagement.admit(any(), anyList(), any())).thenAnswer(call -> new EngagementBudgetPort.Admission(
                ((List<EngagementBudgetPort.Recipient>) call.getArgument(1)).stream().map(EngagementBudgetPort.Recipient::userId)
                        .toList(), 0, 0, 0));
    }

    private static NotificationPreferences newsletter(boolean email, boolean push) {
        return new NotificationPreferences(Map.of(
                new NotificationPreferences.Choice(NotificationCategory.NEWSLETTER, NotificationChannel.EMAIL), email,
                new NotificationPreferences.Choice(NotificationCategory.NEWSLETTER, NotificationChannel.PUSH), push),
                new MarketingConsent(true, DAYTIME, ConsentSource.MOBILE));
    }

    @Test
    void sendsToEveryDeviceOfEachAccountInItsLanguageAndRecordsIt() {
        members(ana, bruno);
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.EN),
                device(ana, "a2", NotificationLocale.EN), device(bruno, "b1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana, bruno));

        var messages = sent(1).get(0);
        assertThat(messages).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[a1]", "ExpoPushToken[a2]", "ExpoPushToken[b1]");
        assertThat(messages).allMatch(PushSenderPort.Message::urgent);
        verify(renderer).render(NotificationType.EVENT_REMINDER, NotificationLocale.EN, Map.of("title", "Tasting"));
        verify(renderer).render(NotificationType.EVENT_REMINDER, NotificationLocale.ES, Map.of("title", "Tasting"));
        verify(sendLog).record("key", List.of(ana, bruno), NotificationCategory.TICKETS, false, DAYTIME);
        var saved = ArgumentCaptor.forClass(Collection.class);
        verify(receipts).save(saved.capture(), eq(DAYTIME));
        assertThat(saved.getValue()).hasSize(3).contains(new PushReceiptStorePort.Pending("ticket-ExpoPushToken[a1]", "ExpoPushToken[a1]", NotificationType.EVENT_REMINDER));
    }

    @Test
    void aRetriedJobSkipsAccountsAlreadyReachedAndInactiveOnesAreNeverAsked() {
        when(sendLog.alreadySent("key", List.of(ana, bruno))).thenReturn(Set.of(ana));
        when(audience.findActive(List.of(bruno))).thenReturn(List.of());

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana, bruno));

        verify(audience).findActive(List.of(bruno));
        verifyNoInteractions(sender, outbox);
    }

    @Test
    void everyoneAlreadyReachedSendsNothing() {
        when(sendLog.alreadySent("key", List.of(ana))).thenReturn(Set.of(ana));

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana));

        verifyNoInteractions(audience, sender);
    }

    @Test
    void optionalPushesFollowThePushPreferenceNotTheEmailOne() {
        members(ana, bruno);
        when(preferences.load(ana)).thenReturn(newsletter(true, false));
        when(preferences.load(bruno)).thenReturn(newsletter(false, true));
        when(devices.findByUsers(List.of(bruno))).thenReturn(List.of(device(bruno, "b1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana, bruno));

        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[b1]");
        assertThat(sent(1).get(0)).noneMatch(PushSenderPort.Message::urgent);
        verify(sendLog).reserve(eq("key"), eq(List.of(bruno)), eq(NotificationCategory.NEWSLETTER), eq(true), eq(DAYTIME), any());
        verify(sendLog, never()).record(any(), anyCollection(), any(), anyBoolean(), any());
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.BLOCKED_BY_PREFERENCES, 1), DAYTIME);
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.SENT, 1), DAYTIME);
    }

    @Test
    void optionalPushesWaitOutQuietHoursAsADelayedCopyForThoseAccounts() {
        // 23:30 in Buenos Aires, 11:30 in Tokyo.
        Instant night = Instant.parse("2026-10-21T02:30:00Z");
        when(audience.findActive(List.of(ana, bruno))).thenReturn(List.of(new PushAudiencePort.Member(ana, BUENOS_AIRES),
                new PushAudiencePort.Member(bruno, ZoneId.of("Asia/Tokyo"))));
        when(devices.findByUsers(List.of(bruno))).thenReturn(List.of(device(bruno, "b1", NotificationLocale.EN)));

        service(night).deliver(request(NotificationType.NEWSLETTER, ana, bruno));

        Instant eightLocal = Instant.parse("2026-10-21T11:00:00Z");
        var stored = ArgumentCaptor.forClass(PushRequest.class);
        verify(outbox).store(stored.capture(), eq(Duration.between(night, eightLocal)));
        assertThat(stored.getValue().userIds()).containsExactly(ana);
        assertThat(stored.getValue().dedupeKey()).isEqualTo("key:quiet:" + eightLocal.getEpochSecond());
        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[b1]");
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.DEFERRED_QUIET_HOURS, 1), night);
    }

    @Test
    void aDeferredCopyKeepsTheOriginalKeyBaseAndTheLastMinuteOfQuietCountsAsOver() {
        Instant almostEight = Instant.parse("2026-10-21T10:59:30Z");
        when(audience.findActive(List.of(ana))).thenReturn(List.of(new PushAudiencePort.Member(ana, BUENOS_AIRES)));
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        service(almostEight).deliver(new PushRequest(NotificationType.NEWSLETTER, List.of(ana), Map.of(), "key:quiet:1"));
        sent(1);
        verifyNoInteractions(outbox);

        Instant night = Instant.parse("2026-10-21T02:30:00Z");
        service(night).deliver(new PushRequest(NotificationType.NEWSLETTER, List.of(ana), Map.of(), "key:quiet:1"));
        var stored = ArgumentCaptor.forClass(PushRequest.class);
        verify(outbox).store(stored.capture(), any());
        assertThat(stored.getValue().dedupeKey()).isEqualTo("key:quiet:" + Instant.parse("2026-10-21T11:00:00Z").getEpochSecond());
    }

    @Test
    void transactionalPushesIgnoreQuietHoursAndTheCap() {
        Instant night = Instant.parse("2026-10-21T02:30:00Z");
        when(audience.findActive(List.of(ana))).thenReturn(List.of(new PushAudiencePort.Member(ana, BUENOS_AIRES)));
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));

        service(night).deliver(request(NotificationType.EVENT_REMINDER, ana));

        sent(1);
        verify(sendLog, never()).cappedSince(anyCollection(), any());
        verifyNoInteractions(outbox, preferences);
    }

    @Test
    void deferrableTransactionalPushesWaitOutQuietHoursWithoutPreferencesOrCapAndAreNotUrgent() {
        Instant night = Instant.parse("2026-10-21T02:30:00Z");
        when(audience.findActive(List.of(ana, bruno))).thenReturn(List.of(new PushAudiencePort.Member(ana, BUENOS_AIRES),
                new PushAudiencePort.Member(bruno, ZoneId.of("Asia/Tokyo"))));
        when(devices.findByUsers(List.of(bruno))).thenReturn(List.of(device(bruno, "b1", NotificationLocale.EN)));

        service(night).deliver(new PushRequest(NotificationType.EVENT_REMINDER, List.of(ana, bruno), Map.of(), "key", true));

        var stored = ArgumentCaptor.forClass(PushRequest.class);
        verify(outbox).store(stored.capture(), any());
        assertThat(stored.getValue().userIds()).containsExactly(ana);
        assertThat(stored.getValue().deferrable()).isTrue();
        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::urgent).containsExactly(false);
        verify(sendLog, never()).cappedSince(anyCollection(), any());
        verify(sendLog).record(eq("key"), eq(List.of(bruno)), eq(NotificationCategory.TICKETS), eq(false), any());
        verifyNoInteractions(preferences);
    }

    @Test
    void anExpiredPushSendsNothingAndAWaitEndingAfterTheDeadlineDropsThoseAccounts() {
        Instant night = Instant.parse("2026-10-21T02:30:00Z");
        service(night).deliver(new PushRequest(NotificationType.EVENT_REMINDER, List.of(ana), Map.of(), "key", false, night));
        verifyNoInteractions(audience, sender, outbox, sendLog);
        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.EXPIRED, 1), night);

        when(sendLog.alreadySent("key", List.of(ana, bruno))).thenReturn(Set.of());
        when(audience.findActive(List.of(ana, bruno))).thenReturn(List.of(new PushAudiencePort.Member(ana, BUENOS_AIRES),
                new PushAudiencePort.Member(bruno, ZoneId.of("Asia/Tokyo"))));
        when(devices.findByUsers(List.of(bruno))).thenReturn(List.of(device(bruno, "b1", NotificationLocale.EN)));
        // Ana's quiet hours end at 08:00 local (11:00 UTC), after the 10:00 UTC deadline.
        service(night).deliver(new PushRequest(NotificationType.EVENT_REMINDER, List.of(ana, bruno), Map.of(), "key", true,
                Instant.parse("2026-10-21T10:00:00Z")));
        verifyNoInteractions(outbox);
        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[b1]");
        verify(metrics, times(2)).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.EXPIRED, 1), night);
    }

    @Test
    void aCategoryWithItsOwnDailyLimitDropsAccountsThatAlreadyHadOneThatDay() {
        members(ana, bruno);
        when(sendLog.sentInCategorySince(List.of(ana, bruno), NotificationCategory.EVENTS_NEARBY, DAYTIME.minus(Duration.ofDays(1))))
                .thenReturn(Map.of(ana, 1));
        when(preferences.load(any())).thenReturn(NotificationPreferences.defaults());
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(bruno, "b1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.EVENT_NEARBY, ana, bruno));

        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[b1]");
        verify(metrics).record(NotificationType.EVENT_NEARBY, Map.of(PushOutcome.DROPPED_CATEGORY_CAP, 1), DAYTIME);
    }

    @Test
    void promotionalPushesNeedMarketingConsentEvenWhenTheCategoryIsOn() {
        members(ana);
        var chosenWithoutConsent = new NotificationPreferences(Map.of(
                new NotificationPreferences.Choice(NotificationCategory.RECOMMENDATIONS, NotificationChannel.PUSH), true,
                new NotificationPreferences.Choice(NotificationCategory.NEWSLETTER, NotificationChannel.PUSH), true),
                MarketingConsent.none());
        when(preferences.load(ana)).thenReturn(chosenWithoutConsent);

        service(DAYTIME).deliver(request(NotificationType.WINE_RECOMMENDATION, ana));
        service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana));

        verifyNoInteractions(sender, outbox);
    }

    @Test
    void activitySummariesAreNotMarketingAndOnlyFollowTheirOwnCategory() {
        members(ana, bruno);
        when(preferences.load(ana)).thenReturn(NotificationPreferences.defaults());
        when(preferences.load(bruno)).thenReturn(new NotificationPreferences(Map.of(
                new NotificationPreferences.Choice(NotificationCategory.COMMUNITY, NotificationChannel.PUSH), false),
                MarketingConsent.none()));
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.REVIEW_LIKES_DAILY, ana, bruno));

        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[a1]");
    }

    @Test
    void recommendationsAreLimitedToOnePerAccountInAnySevenDays() {
        members(ana, bruno);
        var optedIn = new NotificationPreferences(Map.of(
                new NotificationPreferences.Choice(NotificationCategory.RECOMMENDATIONS, NotificationChannel.PUSH), true),
                new MarketingConsent(true, DAYTIME, ConsentSource.MOBILE));
        when(preferences.load(any())).thenReturn(optedIn);
        when(sendLog.sentInCategorySince(List.of(ana, bruno), NotificationCategory.RECOMMENDATIONS, DAYTIME.minus(Duration.ofDays(7))))
                .thenReturn(Map.of(ana, 1));
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(bruno, "b1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.WINE_RECOMMENDATION, ana, bruno));

        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[b1]");
    }

    @Test
    void theSendLogIsKeptAtLeastAsLongAsTheLongestCategoryWindow() {
        for (NotificationCategory category : NotificationCategory.values()) {
            category.pushLimit().ifPresent(limit ->
                    assertThat(limit.window()).as(category.name()).isLessThanOrEqualTo(CheckPushReceiptsService.SEND_LOG_RETENTION));
        }
    }

    @Test
    void categoriesWithoutTheirOwnLimitNeverAskForIt() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana));
        verify(sendLog, never()).sentInCategorySince(anyCollection(), any(), any());
    }

    @Test
    void optionalPushesStopAtTheDailyCap() {
        members(ana, bruno);
        when(sendLog.cappedSince(List.of(ana, bruno), DAYTIME.minus(Duration.ofDays(1)))).thenReturn(Map.of(ana, 3, bruno, 2));
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(bruno, "b1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana, bruno));

        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[b1]");
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.DROPPED_DAILY_CAP, 1), DAYTIME);
    }

    @Test
    void batchesHoldAtMostOneHundredMessagesAndKeepAnAccountsDevicesTogether() {
        List<UUID> users = IntStream.range(0, 60).mapToObj(index -> UUID.randomUUID()).toList();
        when(audience.findActive(users)).thenReturn(users.stream().map(id -> new PushAudiencePort.Member(id, BUENOS_AIRES)).toList());
        List<PushDevice> owned = new ArrayList<>();
        users.forEach(id -> {
            owned.add(device(id, id + "-1", NotificationLocale.ES));
            owned.add(device(id, id + "-2", NotificationLocale.ES));
        });
        when(devices.findByUsers(users)).thenReturn(owned);

        service(DAYTIME).deliver(new PushRequest(NotificationType.EVENT_REMINDER, users, Map.of(), "key"));

        var batches = sent(2);
        assertThat(batches.get(0)).hasSize(100);
        assertThat(batches.get(1)).hasSize(20);
        verify(sendLog).record("key", users.subList(0, 50), NotificationCategory.TICKETS, false, DAYTIME);
        verify(sendLog).record("key", users.subList(50, 60), NotificationCategory.TICKETS, false, DAYTIME);
    }

    @Test
    void anAccountKeepsAtMostTenDevicesAndAccountsWithoutDevicesAreSkipped() {
        members(ana, bruno);
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(IntStream.range(0, 12)
                .mapToObj(index -> device(ana, "a" + index, NotificationLocale.ES)).toList());

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana, bruno));

        assertThat(sent(1).get(0)).hasSize(DeliverPushService.MAX_DEVICES_PER_USER);
        verify(sendLog).record("key", List.of(ana), NotificationCategory.TICKETS, false, DAYTIME);
    }

    @Test
    void tokensTheProviderNoLongerKnowsAreForgottenAndOnlyAcceptedTicketsAwaitReceipts() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES), device(ana, "a2", NotificationLocale.ES)));
        when(sender.send(anyList())).thenReturn(List.of(new PushSenderPort.Ticket("ExpoPushToken[a1]", null, "DeviceNotRegistered"),
                new PushSenderPort.Ticket("ExpoPushToken[a2]", "t2", null)));

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana));

        verify(devices).deleteTokens(List.of("ExpoPushToken[a1]"));
        verify(receipts).save(List.of(new PushReceiptStorePort.Pending("t2", "ExpoPushToken[a2]", NotificationType.EVENT_REMINDER)), DAYTIME);
        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 1, PushOutcome.FAILED, 1), DAYTIME);
    }

    @Test
    void theSendIsRecordedAsSoonAsTheProviderAcceptsItSoAReceiptFailureNeverResendsTheBatch() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES), device(ana, "a2", NotificationLocale.ES)));
        when(sender.send(anyList())).thenReturn(List.of(new PushSenderPort.Ticket("ExpoPushToken[a1]", null, "DeviceNotRegistered"),
                new PushSenderPort.Ticket("ExpoPushToken[a2]", "t2", null)));
        doThrow(new IllegalStateException("receipts down")).when(receipts).save(anyCollection(), any());
        doThrow(new IllegalStateException("devices down")).when(devices).deleteTokens(anyCollection());

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana));

        InOrder order = inOrder(sender, sendLog, receipts, devices);
        order.verify(sender).send(anyList());
        order.verify(sendLog).record("key", List.of(ana), NotificationCategory.TICKETS, false, DAYTIME);
        order.verify(receipts).save(anyCollection(), eq(DAYTIME));
        order.verify(devices).deleteTokens(List.of("ExpoPushToken[a1]"));
        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 1, PushOutcome.FAILED, 1), DAYTIME);
    }

    @Test
    void aTypeSwitchedOffIsDroppedNotDeferredQuietHourCopiesIncluded() {
        when(switches.isEnabled(NotificationType.NEWSLETTER)).thenReturn(false);
        Instant night = Instant.parse("2026-10-21T02:30:00Z");

        service(night).deliver(request(NotificationType.NEWSLETTER, ana, bruno));
        service(night).deliver(new PushRequest(NotificationType.NEWSLETTER, List.of(ana), Map.of(), "key:quiet:1"));

        verifyNoInteractions(audience, sendLog, outbox, sender, receipts);
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.SWITCHED_OFF, 2), night);
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.SWITCHED_OFF, 1), night);
    }

    @Test
    void aProviderFailureLeavesEarlierBatchesRecordedAndFailsTheJob() {
        List<UUID> users = IntStream.range(0, 101).mapToObj(index -> UUID.randomUUID()).toList();
        when(audience.findActive(users)).thenReturn(users.stream().map(id -> new PushAudiencePort.Member(id, BUENOS_AIRES)).toList());
        when(devices.findByUsers(users)).thenReturn(users.stream().map(id -> device(id, id.toString(), NotificationLocale.ES)).toList());
        when(sender.send(anyList())).thenReturn(users.subList(0, 100).stream()
                .map(id -> new PushSenderPort.Ticket("ExpoPushToken[" + id + "]", null, null)).toList())
                .thenThrow(new IllegalStateException("provider down"));

        assertThatThrownBy(() -> service(DAYTIME).deliver(new PushRequest(NotificationType.EVENT_REMINDER, users, Map.of(), "key")))
                .hasMessage("provider down");
        verify(sendLog, times(1)).record("key", users.subList(0, 100), NotificationCategory.TICKETS, false, DAYTIME);
    }

    @Test
    void sentCountsOnlyAccountsWithAnAcceptedTicket() {
        members(ana, bruno);
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(ana, "a2", NotificationLocale.ES), device(bruno, "b1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenReturn(List.of(new PushSenderPort.Ticket("ExpoPushToken[a1]", null, "MessageRateExceeded"),
                new PushSenderPort.Ticket("ExpoPushToken[a2]", null, "MessageTooBig"),
                new PushSenderPort.Ticket("ExpoPushToken[b1]", "t1", null)));

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana, bruno));

        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 1, PushOutcome.FAILED, 2), DAYTIME);
    }

    @Test
    void everyMessageCarriesTheTypeTheDedupeKeyTheDeadlineAndWhetherTheDeviceHasChannels() {
        members(ana);
        Instant deadline = DAYTIME.plus(Duration.ofHours(2));
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(
                new PushDevice(ana, new PushToken("ExpoPushToken[new]"), PushPlatform.ANDROID, NotificationLocale.ES, DAYTIME, true),
                device(ana, "old", NotificationLocale.ES)));

        service(DAYTIME).deliver(new PushRequest(NotificationType.EVENT_REMINDER, List.of(ana), Map.of(), "reminder:r1", false, deadline));

        assertThat(sent(1).get(0)).containsExactly(
                new PushSenderPort.Message("ExpoPushToken[new]", CONTENT, true, NotificationType.EVENT_REMINDER, "reminder:r1", deadline, true),
                new PushSenderPort.Message("ExpoPushToken[old]", CONTENT, true, NotificationType.EVENT_REMINDER, "reminder:r1", deadline, false));
    }

    @Test
    void thePreferencesOfEveryMemberAreReadInOneBatch() {
        members(ana, bruno);
        doReturn(Map.of(ana, newsletter(false, true), bruno, newsletter(true, false))).when(preferences).loadAll(List.of(ana, bruno));
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana, bruno));

        verify(preferences, times(1)).loadAll(List.of(ana, bruno));
        verify(preferences, never()).load(any());
        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[a1]");
    }

    @Test
    void limitsAreOnlyCheckedInsideTheReservationOfAccountsWithADevice() {
        members(ana, bruno);
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        doReturn(List.of()).when(sendLog).reserve(any(), anyList(), any(), anyBoolean(), any(), any());

        service(DAYTIME).deliver(request(NotificationType.EVENT_NEARBY, ana, bruno));

        verify(sendLog).reserve(eq("key"), eq(List.of(ana)), eq(NotificationCategory.EVENTS_NEARBY), eq(true), eq(DAYTIME), any());
        verify(sendLog, never()).cappedSince(anyCollection(), any());
        verify(sendLog, never()).sentInCategorySince(anyCollection(), any(), any());
        verifyNoInteractions(sender);
    }

    @Test
    void transactionalPushesAreRecordedAfterTheProviderAcceptsThemNotReserved() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana));

        verify(sendLog, never()).reserve(any(), anyList(), any(), anyBoolean(), any(), any());
        InOrder order = inOrder(sender, sendLog);
        order.verify(sender).send(anyList());
        order.verify(sendLog).record("key", List.of(ana), NotificationCategory.TICKETS, false, DAYTIME);
    }

    @Test
    void aProviderFailureReleasesTheReservationsOfAccountsNotReachedAndFailsTheJob() {
        List<UUID> users = elevenAccountsWithTenDevicesEach();
        when(sender.send(anyList())).thenAnswer(DeliverPushServiceTest::accepted).thenThrow(new IllegalStateException("provider down"));

        assertThatThrownBy(() -> service(DAYTIME).deliver(new PushRequest(NotificationType.NEWSLETTER, users, Map.of(), "key")))
                .hasMessage("provider down");

        verify(sendLog).reserve(eq("key"), eq(users), eq(NotificationCategory.NEWSLETTER), eq(true), eq(DAYTIME), any());
        verify(sendLog).release("key", List.of(users.get(10)));
        verify(sendLog, never()).record(any(), anyCollection(), any(), anyBoolean(), any());
    }

    @Test
    void aFailedReleaseStillFailsTheJobWithTheProviderError() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenThrow(new IllegalStateException("provider down"));
        doThrow(new IllegalStateException("database down")).when(sendLog).release(any(), anyCollection());

        assertThatThrownBy(() -> service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana))).hasMessage("provider down");

        verify(sendLog).release("key", List.of(ana));
    }

    @Test
    void aRejectedBatchCountsAsFailedIsNeverSentAgainAndTheOthersGoOn() {
        List<UUID> users = elevenAccountsWithTenDevicesEach();
        when(sender.send(anyList())).thenThrow(new PushSenderPort.RejectedException("Expo rejected the push request with status 400"))
                .thenAnswer(DeliverPushServiceTest::accepted);

        service(DAYTIME).deliver(new PushRequest(NotificationType.EVENT_REMINDER, users, Map.of(), "key"));

        verify(sendLog).record("key", users.subList(0, 10), NotificationCategory.TICKETS, false, DAYTIME);
        verify(sendLog).record("key", users.subList(10, 11), NotificationCategory.TICKETS, false, DAYTIME);
        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.FAILED, 100), DAYTIME);
        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 1), DAYTIME);
    }

    @Test
    void aRejectedReservedBatchReleasesItsReservationsSoTheyUseUpNoLimit() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenThrow(new PushSenderPort.RejectedException("Expo rejected the push request with status 400"));

        service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana));

        verify(sendLog).release("key", List.of(ana));
        verify(engagement, never()).release(any(), anyCollection());
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.FAILED, 1), DAYTIME);
    }

    @Test
    void aRejectedEngagementBatchReleasesItsEngagementRowsSoItNeitherUsesTheBudgetNorCountsAsUnopened() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenThrow(new PushSenderPort.RejectedException("Expo rejected the push request with status 413"));

        service(DAYTIME).deliver(request(NotificationType.TASTE_PICK, ana));

        verify(sendLog).release("key", List.of(ana));
        verify(engagement).release("key", List.of(ana));
    }

    @Test
    void anAccountWithoutAnyAcceptedTicketIsReleasedAndOneReachedIsKept() {
        members(ana, bruno);
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(ana, "a2", NotificationLocale.ES), device(bruno, "b1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenReturn(List.of(new PushSenderPort.Ticket("ExpoPushToken[a1]", null, "DeviceNotRegistered"),
                new PushSenderPort.Ticket("ExpoPushToken[a2]", null, "MessageTooBig"),
                new PushSenderPort.Ticket("ExpoPushToken[b1]", "t1", null)));

        service(DAYTIME).deliver(request(NotificationType.ONBOARDING, ana, bruno));

        verify(sendLog).release("key", List.of(ana));
        verify(engagement).release("key", List.of(ana));
        verify(metrics).record(NotificationType.ONBOARDING, Map.of(PushOutcome.SENT, 1, PushOutcome.FAILED, 2), DAYTIME);
    }

    @Test
    void aMetricsFailureAfterTheProviderAcceptedTheBatchNeitherFailsTheJobNorReleasesTheReachedAccounts() {
        List<UUID> users = elevenAccountsWithTenDevicesEach();
        doThrow(new IllegalStateException("metrics down")).when(metrics).record(any(), any(), any());

        service(DAYTIME).deliver(new PushRequest(NotificationType.NEWSLETTER, users, Map.of(), "key"));

        sent(2);
        verify(sendLog, never()).release(any(), anyCollection());
    }

    @Test
    void aMetricsFailureBeforeSendingStillSendsToTheReservedAccounts() {
        members(ana, bruno);
        when(preferences.load(ana)).thenReturn(newsletter(true, false));
        when(devices.findByUsers(List.of(bruno))).thenReturn(List.of(device(bruno, "b1", NotificationLocale.ES)));
        doThrow(new IllegalStateException("metrics down")).when(metrics).record(any(), any(), any());

        service(DAYTIME).deliver(request(NotificationType.NEWSLETTER, ana, bruno));

        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[b1]");
        verify(sendLog, never()).release(any(), anyCollection());
    }

    @Test
    void anEngagementPushPassesTheEngagementBudgetWhileTheAccountsAreLockedAndCountsWhatItDropped() {
        UUID carla = UUID.randomUUID();
        UUID diego = UUID.randomUUID();
        members(ana, bruno, carla, diego);
        when(devices.findByUsers(List.of(ana, bruno, carla, diego))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(bruno, "b1", NotificationLocale.ES), device(carla, "c1", NotificationLocale.ES),
                device(diego, "d1", NotificationLocale.ES)));
        when(engagement.admit(any(), anyList(), any())).thenReturn(new EngagementBudgetPort.Admission(List.of(ana), 1, 1, 1));
        InOrder order = inOrder(sendLog, engagement, sender);

        service(DAYTIME).deliver(new PushRequest(NotificationType.TASTE_PICK, List.of(ana, bruno, carla, diego),
                Map.of("wineId", "w", NotificationType.CONTENT_REF, "WINE:w"), "engagement:taste"));

        order.verify(sendLog).reserve(eq("engagement:taste"), anyList(), eq(NotificationCategory.RECOMMENDATIONS), eq(false),
                eq(DAYTIME), any());
        order.verify(engagement).admit(new EngagementBudgetPort.Push(NotificationType.TASTE_PICK, "engagement:taste", "WINE:w"),
                List.of(new EngagementBudgetPort.Recipient(ana, BUENOS_AIRES), new EngagementBudgetPort.Recipient(bruno, BUENOS_AIRES),
                        new EngagementBudgetPort.Recipient(carla, BUENOS_AIRES), new EngagementBudgetPort.Recipient(diego, BUENOS_AIRES)),
                DAYTIME);
        order.verify(sender).send(anyList());
        assertThat(sent(1).get(0)).extracting(PushSenderPort.Message::token).containsExactly("ExpoPushToken[a1]");
        verify(metrics).record(NotificationType.TASTE_PICK, Map.of(PushOutcome.DROPPED_ENGAGEMENT_BUDGET, 1,
                PushOutcome.DROPPED_FATIGUE, 1, PushOutcome.DROPPED_HOLDOUT, 1), DAYTIME);
    }

    @Test
    void anEngagementPushTheBudgetRefusesEntirelyIsNotSent() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        when(engagement.admit(any(), anyList(), any())).thenReturn(new EngagementBudgetPort.Admission(List.of(), 1, 0, 0));

        service(DAYTIME).deliver(request(NotificationType.WINBACK, ana));

        verify(engagement).admit(new EngagementBudgetPort.Push(NotificationType.WINBACK, "key", null),
                List.of(new EngagementBudgetPort.Recipient(ana, BUENOS_AIRES)), DAYTIME);
        verifyNoInteractions(sender);
    }

    /** S10: the engagement budget alone governs engagement pushes; the reactive daily cap neither drops nor counts them. */
    @Test
    void anEngagementPushIgnoresTheReactiveDailyCapAndIsNotCountedTowardIt() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        when(sendLog.cappedSince(List.of(ana), DAYTIME.minus(Duration.ofDays(1)))).thenReturn(Map.of(ana, 3));

        service(DAYTIME).deliver(request(NotificationType.ONBOARDING, ana));

        verify(sendLog).reserve(eq("key"), eq(List.of(ana)), eq(NotificationCategory.REMINDERS), eq(false), eq(DAYTIME), any());
        verify(sendLog, never()).cappedSince(anyCollection(), any());
        verify(engagement).admit(any(), anyList(), any());
        sent(1);
    }

    /** S11: an event-triggered wine suggestion waits until 09:00 locally, other optional pushes until 08:00. */
    @Test
    void engagementPushesWaitUntilNineLocallyWhileOtherOptionalPushesGoAtEight() {
        Instant halfPastEight = Instant.parse("2026-10-21T11:30:00Z");
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));

        service(halfPastEight).deliver(request(NotificationType.WINE_RECOMMENDATION, ana));

        Instant nine = Instant.parse("2026-10-21T12:00:00Z");
        var stored = ArgumentCaptor.forClass(PushRequest.class);
        verify(outbox).store(stored.capture(), eq(Duration.between(halfPastEight, nine)));
        assertThat(stored.getValue().dedupeKey()).isEqualTo("key:quiet:" + nine.getEpochSecond());
        verifyNoInteractions(sender, engagement);

        service(halfPastEight).deliver(request(NotificationType.NEWSLETTER, ana));
        sent(1);
    }

    /** S5: an event push and a wine suggestion in the same week both go; only the suggestion asks the budget. */
    @Test
    void transactionalAndSocialPushesNeverAskTheEngagementBudgetSoTheyAreNeverBlockedNorCounted() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana));
        service(DAYTIME).deliver(request(NotificationType.REVIEW_COMMENT, ana));
        service(DAYTIME).deliver(request(NotificationType.EVENT_NEARBY, ana));

        verifyNoInteractions(engagement);
        sent(3);
    }

    @Test
    void aFailedEngagementPushReleasesItsEngagementRowsSoTheRetryDecidesAgain() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenThrow(new IllegalStateException("provider down"));

        assertThatThrownBy(() -> service(DAYTIME).deliver(request(NotificationType.POST_EVENT, ana)))
                .isInstanceOf(IllegalStateException.class);

        verify(sendLog).release("key", List.of(ana));
        verify(engagement).release("key", List.of(ana));
    }

    @Test
    void aFailedNonEngagementPushNeverTouchesTheEngagementLedger() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenThrow(new IllegalStateException("provider down"));

        assertThatThrownBy(() -> service(DAYTIME).deliver(request(NotificationType.REVIEW_LIKES_DAILY, ana)))
                .isInstanceOf(IllegalStateException.class);

        verify(engagement, never()).release(any(), anyCollection());
    }

    private List<UUID> elevenAccountsWithTenDevicesEach() {
        List<UUID> users = IntStream.range(0, 11).mapToObj(index -> UUID.randomUUID()).toList();
        when(audience.findActive(users)).thenReturn(users.stream().map(id -> new PushAudiencePort.Member(id, BUENOS_AIRES)).toList());
        when(devices.findByUsers(users)).thenReturn(users.stream().flatMap(id -> IntStream.range(0, 10)
                .mapToObj(index -> device(id, id + "-" + index, NotificationLocale.ES))).toList());
        return users;
    }

    private static List<PushSenderPort.Ticket> accepted(InvocationOnMock call) {
        return ((List<PushSenderPort.Message>) call.getArgument(0)).stream()
                .map(message -> new PushSenderPort.Ticket(message.token(), "ticket-" + message.token(), null)).toList();
    }

    @Test
    void theDailyCapMustAllowAtLeastOnePush() {
        assertThatThrownBy(() -> new DeliverPushService(audience, preferences, devices, renderer, sender, sendLog, receipts, outbox,
                switches, metrics, engagement, announcementStats, 0, Clock.systemUTC())).isInstanceOf(IllegalArgumentException.class);
    }

    private DeliverPushService service(Instant now) {
        return new DeliverPushService(audience, preferences, devices, renderer, sender, sendLog, receipts, outbox,
                switches, metrics, engagement, announcementStats, 3, Clock.fixed(now, ZoneOffset.UTC));
    }

    private void members(UUID... users) {
        when(audience.findActive(List.of(users))).thenReturn(Arrays.stream(users)
                .map(id -> new PushAudiencePort.Member(id, BUENOS_AIRES)).toList());
    }

    private static PushRequest request(NotificationType type, UUID... users) {
        return new PushRequest(type, List.of(users), Map.of("title", "Tasting"), "key");
    }

    private static PushDevice device(UUID user, String token, NotificationLocale locale) {
        return new PushDevice(user, new PushToken("ExpoPushToken[" + token + "]"), PushPlatform.ANDROID, locale, DAYTIME);
    }

    @SuppressWarnings("unchecked")
    private List<List<PushSenderPort.Message>> sent(int batches) {
        var captor = ArgumentCaptor.forClass(List.class);
        verify(sender, times(batches)).send(captor.capture());
        return (List<List<PushSenderPort.Message>>) (List<?>) captor.getAllValues();
    }

    @Test
    void anAnnouncementPushCountsTheAccountsItReachedAndTheRejectedMessagesAndItsTicketsNameTheAnnouncement() {
        UUID announcement = UUID.randomUUID();
        members(ana, bruno);
        when(devices.findByUsers(List.of(ana, bruno))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(ana, "a2", NotificationLocale.ES), device(bruno, "b1", NotificationLocale.ES)));
        when(sender.send(anyList())).thenReturn(List.of(new PushSenderPort.Ticket("ExpoPushToken[a1]", null, "DeviceNotRegistered"),
                new PushSenderPort.Ticket("ExpoPushToken[a2]", "t2", null), new PushSenderPort.Ticket("ExpoPushToken[b1]", "t3", null)));

        service(DAYTIME).deliver(new PushRequest(NotificationType.NEWSLETTER, List.of(ana, bruno), Map.of("title", "Tasting"),
                AnnouncementRef.push(announcement, NotificationLocale.ES, ana), true));

        verify(announcementStats).recordPush(announcement, 2, 1);
        verify(receipts).save(List.of(
                new PushReceiptStorePort.Pending("t2", "ExpoPushToken[a2]", NotificationType.NEWSLETTER, announcement),
                new PushReceiptStorePort.Pending("t3", "ExpoPushToken[b1]", NotificationType.NEWSLETTER, announcement)), DAYTIME);
    }

    @Test
    void aRejectedAnnouncementBatchCountsItsMessagesAsFailedAndACountingFailureNeverFailsTheJob() {
        UUID announcement = UUID.randomUUID();
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES),
                device(ana, "a2", NotificationLocale.ES)));
        when(sender.send(anyList())).thenThrow(new PushSenderPort.RejectedException("Expo rejected the push request with status 400"));
        doThrow(new IllegalStateException("stats down")).when(announcementStats).recordPush(any(), anyInt(), anyInt());

        service(DAYTIME).deliver(new PushRequest(NotificationType.SERVICE_NOTICE, List.of(ana), Map.of("title", "Tasting"),
                AnnouncementRef.push(announcement, NotificationLocale.ES, ana) + ":1", true));

        verify(announcementStats).recordPush(announcement, 0, 2);
        verify(metrics).record(NotificationType.SERVICE_NOTICE, Map.of(PushOutcome.FAILED, 2), DAYTIME);
    }

    @Test
    void otherPushesAreNeverCountedAgainstAnAnnouncement() {
        members(ana);
        when(devices.findByUsers(List.of(ana))).thenReturn(List.of(device(ana, "a1", NotificationLocale.ES)));

        service(DAYTIME).deliver(request(NotificationType.EVENT_REMINDER, ana));

        verifyNoInteractions(announcementStats);
    }
}
