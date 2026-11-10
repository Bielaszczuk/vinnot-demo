package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.application.port.out.PushMetricsPort;
import com.vinnot.notification.application.port.out.PushReceiptStorePort;
import com.vinnot.notification.application.port.out.PushSendLogPort;
import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class CheckPushReceiptsServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-21T12:00:00Z");
    private static final Instant DUE_BEFORE = NOW.minus(Duration.ofMinutes(15));
    private final PushReceiptStorePort store = mock(PushReceiptStorePort.class);
    private final PushSenderPort sender = mock(PushSenderPort.class);
    private final PushDeviceRepositoryPort devices = mock(PushDeviceRepositoryPort.class);
    private final PushSendLogPort sendLog = mock(PushSendLogPort.class);
    private final PushMetricsPort metrics = mock(PushMetricsPort.class);
    private final AnnouncementStatsPort announcementStats = mock(AnnouncementStatsPort.class);
    private final CheckPushReceiptsService service = new CheckPushReceiptsService(store, sender, devices, sendLog, metrics,
            announcementStats, Duration.ofMinutes(4), Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void forgetsUnregisteredDevicesAndDropsTheReceiptsItRead() {
        when(store.due(DUE_BEFORE, null, 1000)).thenReturn(new PushReceiptStorePort.Chunk(List.of(
                new PushReceiptStorePort.Pending("t1", "ExpoPushToken[a]", NotificationType.EVENT_REMINDER),
                new PushReceiptStorePort.Pending("t2", "ExpoPushToken[b]", NotificationType.EVENT_REMINDER),
                new PushReceiptStorePort.Pending("t3", "ExpoPushToken[c]", NotificationType.EVENT_REMINDER)), null));
        when(sender.receipts(List.of("t1", "t2", "t3"))).thenReturn(Map.of("t1", new PushSenderPort.Receipt(true, null),
                "t2", new PushSenderPort.Receipt(false, "DeviceNotRegistered")));

        assertThat(service.execute(NOW)).isEqualTo(2);

        verify(devices).deleteTokens(List.of("ExpoPushToken[b]"));
        verify(store).delete(Map.of("t1", 0, "t2", 0).keySet());
        verify(store).purgeBefore(NOW.minus(Duration.ofDays(1)));
        verify(sendLog).purgeBefore(NOW.minus(Duration.ofDays(7)));
        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.FAILED, 1), NOW);
    }

    @Test
    void undeliveredReceiptsCountAgainstTheirTypeButOlderTicketsHaveNone() {
        when(store.due(any(), any(), anyInt())).thenReturn(new PushReceiptStorePort.Chunk(List.of(
                new PushReceiptStorePort.Pending("t1", "ExpoPushToken[a]", NotificationType.PAYMENT_CHARGEBACK),
                new PushReceiptStorePort.Pending("t2", "ExpoPushToken[b]", NotificationType.PAYMENT_CHARGEBACK),
                new PushReceiptStorePort.Pending("t3", "ExpoPushToken[c]", null)), null));
        when(sender.receipts(any())).thenReturn(Map.of("t1", new PushSenderPort.Receipt(false, "MessageRateExceeded"),
                "t2", new PushSenderPort.Receipt(false, "MessageTooBig"), "t3", new PushSenderPort.Receipt(false, "InvalidCredentials")));

        service.execute(NOW);

        verify(metrics).record(NotificationType.PAYMENT_CHARGEBACK, Map.of(PushOutcome.FAILED, 2), NOW);
        verifyNoMoreInteractions(metrics);
    }

    @Test
    void nothingDueAsksTheProviderNothing() {
        when(store.due(any(), any(), anyInt())).thenReturn(new PushReceiptStorePort.Chunk(List.of(), null));

        assertThat(service.execute(NOW)).isZero();
        verify(sender, never()).receipts(any());
    }

    @Test
    void aBacklogIsDrainedChunkByChunkUntilTheLastOneEvenWhenReceiptsAreNotReadyYet() {
        var middle = new PushReceiptStorePort.Cursor(NOW.minus(Duration.ofHours(3)), "t999");
        when(store.due(eq(DUE_BEFORE), isNull(), eq(1000))).thenReturn(new PushReceiptStorePort.Chunk(tickets("a", 1000), middle));
        when(store.due(DUE_BEFORE, middle, 1000)).thenReturn(new PushReceiptStorePort.Chunk(tickets("b", 10), null));
        // The first chunk's receipts are not ready: the walk still moves on instead of reading the same chunk forever.
        when(sender.receipts(any())).thenReturn(Map.of()).thenReturn(Map.of("b0", new PushSenderPort.Receipt(true, null)));

        assertThat(service.execute(NOW)).isEqualTo(1);

        verify(sender, times(2)).receipts(any());
        verify(store).delete(Map.of("b0", 0).keySet());
    }

    @Test
    void theDrainStopsAtItsTimeBudgetAndTheRestWaitsForTheNextRun() {
        var after = new PushReceiptStorePort.Cursor(NOW, "a999");
        when(store.due(eq(DUE_BEFORE), isNull(), eq(1000))).thenReturn(new PushReceiptStorePort.Chunk(tickets("a", 1000), after));
        when(sender.receipts(any())).thenReturn(Map.of());
        Clock running = new Clock() {
            private Instant instant = NOW;

            @Override
            public ZoneId getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                Instant current = instant;
                instant = instant.plus(Duration.ofMinutes(5));
                return current;
            }
        };

        new CheckPushReceiptsService(store, sender, devices, sendLog, metrics, announcementStats, Duration.ofMinutes(4), running).execute(NOW);

        verify(store, never()).due(any(), eq(after), anyInt());
    }

    @Test
    void aChunkTheProviderRejectsIsSkippedAndTheDrainGoesOn() {
        var after = new PushReceiptStorePort.Cursor(NOW, "a999");
        when(store.due(eq(DUE_BEFORE), isNull(), eq(1000))).thenReturn(new PushReceiptStorePort.Chunk(tickets("a", 1000), after));
        when(store.due(DUE_BEFORE, after, 1000)).thenReturn(new PushReceiptStorePort.Chunk(tickets("b", 1), null));
        when(sender.receipts(any())).thenThrow(new PushSenderPort.RejectedException("Expo rejected the push request with status 400"))
                .thenReturn(Map.of("b0", new PushSenderPort.Receipt(true, null)));

        assertThat(service.execute(NOW)).isEqualTo(1);
    }

    @Test
    void theTimeBudgetMustBePositive() {
        assertThatThrownBy(() -> new CheckPushReceiptsService(store, sender, devices, sendLog, metrics, announcementStats, Duration.ZERO, Clock.systemUTC()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CheckPushReceiptsService(store, sender, devices, sendLog, metrics, announcementStats, Duration.ofSeconds(-1),
                Clock.systemUTC())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void noDatabaseTransactionIsHeldWhileTheProviderAnswers() {
        assertThat(CheckPushReceiptsService.class.isAnnotationPresent(Transactional.class)).isFalse();
        assertThat(Arrays.stream(CheckPushReceiptsService.class.getDeclaredMethods())
                .filter(method -> method.isAnnotationPresent(Transactional.class))).isEmpty();
    }

    private static List<PushReceiptStorePort.Pending> tickets(String prefix, int count) {
        return IntStream.range(0, count).mapToObj(index -> new PushReceiptStorePort.Pending(prefix + index,
                "ExpoPushToken[" + prefix + index + "]", NotificationType.EVENT_REMINDER)).toList();
    }

    @Test
    void aLateUndeliveredReceiptCountsAgainstTheAnnouncementItWasSentFor() {
        UUID announcement = UUID.randomUUID();
        UUID other = UUID.randomUUID();
        when(store.due(any(), any(), anyInt())).thenReturn(new PushReceiptStorePort.Chunk(List.of(
                new PushReceiptStorePort.Pending("t1", "ExpoPushToken[a]", NotificationType.NEWSLETTER, announcement),
                new PushReceiptStorePort.Pending("t2", "ExpoPushToken[b]", NotificationType.NEWSLETTER, announcement),
                new PushReceiptStorePort.Pending("t3", "ExpoPushToken[c]", NotificationType.NEWSLETTER, announcement),
                new PushReceiptStorePort.Pending("t4", "ExpoPushToken[d]", NotificationType.SERVICE_NOTICE, other),
                new PushReceiptStorePort.Pending("t5", "ExpoPushToken[e]", NotificationType.EVENT_REMINDER)), null));
        when(sender.receipts(any())).thenReturn(Map.of("t1", new PushSenderPort.Receipt(false, "DeviceNotRegistered"),
                "t2", new PushSenderPort.Receipt(false, "MessageRateExceeded"), "t3", new PushSenderPort.Receipt(true, null),
                "t4", new PushSenderPort.Receipt(true, null), "t5", new PushSenderPort.Receipt(false, "MessageTooBig")));

        service.execute(NOW);

        verify(announcementStats).recordPush(announcement, 0, 2);
        verify(metrics).record(NotificationType.NEWSLETTER, Map.of(PushOutcome.FAILED, 2), NOW);
        verify(metrics).record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.FAILED, 1), NOW);
        verifyNoMoreInteractions(announcementStats);
    }
}
