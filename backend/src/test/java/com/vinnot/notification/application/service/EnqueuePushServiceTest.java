package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.out.PushOutboxPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

class EnqueuePushServiceTest {
    @Test
    void storesTheRequestForImmediateDelivery() {
        var outbox = mock(PushOutboxPort.class);
        var request = new PushRequest(NotificationType.EVENT_REMINDER, List.of(UUID.randomUUID()), Map.of(), "key");

        new EnqueuePushService(outbox).push(request);

        verify(outbox).store(request, Duration.ZERO);
    }

    @Test
    void callerKeysLeaveRoomForTheQuietHoursSuffix() {
        var outbox = mock(PushOutboxPort.class);
        var request = new PushRequest(NotificationType.EVENT_REMINDER, List.of(UUID.randomUUID()), Map.of(),
                "k".repeat(PushRequest.MAX_CALLER_KEY_LENGTH + 1));

        assertThatThrownBy(() -> new EnqueuePushService(outbox).push(request))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(outbox);
    }

    @Test
    void scheduledPushesAreStoredInOneBatchWithTheirDelayAndPastOnesAtOnce() {
        var outbox = mock(PushOutboxPort.class);
        Instant now = Instant.parse("2026-10-21T07:00:00Z");
        var later = new PushRequest(NotificationType.TASTE_PICK, List.of(UUID.randomUUID()), Map.of(), "later");
        var late = new PushRequest(NotificationType.TASTE_PICK, List.of(UUID.randomUUID()), Map.of(), "late");

        new EnqueuePushService(outbox, Clock.fixed(now, ZoneOffset.UTC)).schedule(List.of(
                new PushNotificationPort.ScheduledPush(later, now.plus(Duration.ofHours(12))),
                new PushNotificationPort.ScheduledPush(late, now.minusSeconds(5))));

        verify(outbox).storeAll(List.of(new PushOutboxPort.Delayed(later, Duration.ofHours(12)),
                new PushOutboxPort.Delayed(late, Duration.ZERO)));
    }

    @Test
    void schedulingNothingWritesNothingAndLongKeysAreRefused() {
        var outbox = mock(PushOutboxPort.class);
        new EnqueuePushService(outbox).schedule(List.of());
        var request = new PushRequest(NotificationType.TASTE_PICK, List.of(UUID.randomUUID()), Map.of(),
                "k".repeat(PushRequest.MAX_CALLER_KEY_LENGTH + 1));

        assertThatThrownBy(() -> new EnqueuePushService(outbox).schedule(List.of(
                new PushNotificationPort.ScheduledPush(request, Instant.EPOCH)))).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(outbox);
        assertThatThrownBy(() -> new PushNotificationPort.ScheduledPush(request, null)).isInstanceOf(NullPointerException.class);
    }
}
