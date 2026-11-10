package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.application.port.out.PushOutboxPort;
import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.notification.infrastructure.outbox.OutboxPushAdapter;
import com.vinnot.notification.infrastructure.outbox.PushEffectHandler;
import com.vinnot.notification.application.port.in.DeliverPushUseCase;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.vinnot.notification.application.port.in.CheckPushReceiptsUseCase;
import java.time.Instant;
import java.util.HashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

class PushInfrastructureTest {
    @Test
    void aPushRequestIsOneOutboxJobThatTheHandlerDecodesBack() {
        var queue = mock(DurableEffectQueue.class);
        var delivery = mock(DeliverPushUseCase.class);
        var request = new PushRequest(NotificationType.EVENT_REMINDER, List.of(UUID.randomUUID(), UUID.randomUUID()),
                Map.of("title", "Tasting"), "reminder:1");

        new OutboxPushAdapter(queue).store(request, Duration.ofMinutes(5));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(queue).enqueue(eq("PUSH_NOTIFICATION"), eq("push:reminder:1"), payload.capture(), eq(Duration.ofMinutes(5)));
        var handler = new PushEffectHandler(delivery);
        assertThat(handler.supports("PUSH_NOTIFICATION")).isTrue();
        assertThat(handler.supports("NOTIFICATION")).isFalse();
        handler.execute("PUSH_NOTIFICATION", payload.getValue());
        verify(delivery).deliver(request);
    }

    @Test
    void scheduledPushesAreQueuedInOneBatchWithTheirKeysPayloadsAndDelays() {
        var queue = mock(DurableEffectQueue.class);
        var delivery = mock(DeliverPushUseCase.class);
        var later = new PushRequest(NotificationType.TASTE_PICK, List.of(UUID.randomUUID()), Map.of("wine", "Malbec"),
                "engagement:taste_pick:a", false, Instant.parse("2026-10-22T00:59:00Z"));
        var now = new PushRequest(NotificationType.ONBOARDING, List.of(UUID.randomUUID()), Map.of("step", "1"), "engagement:onboarding:b");

        new OutboxPushAdapter(queue).storeAll(List.of(new PushOutboxPort.Delayed(later, Duration.ofHours(12)),
                new PushOutboxPort.Delayed(now, Duration.ZERO)));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<DurableEffectQueue.Job>> jobs = ArgumentCaptor.forClass(List.class);
        verify(queue).enqueueAll(eq("PUSH_NOTIFICATION"), jobs.capture());
        assertThat(jobs.getValue()).extracting(DurableEffectQueue.Job::key, DurableEffectQueue.Job::delay).containsExactly(
                tuple("push:engagement:taste_pick:a", Duration.ofHours(12)),
                tuple("push:engagement:onboarding:b", Duration.ZERO));
        var handler = new PushEffectHandler(delivery);
        handler.execute("PUSH_NOTIFICATION", jobs.getValue().get(0).payload());
        verify(delivery).deliver(later);
    }

    @Test
    void theDeferrableFlagSurvivesTheOutboxAndJobsQueuedBeforeItAreImmediate() {
        var queue = mock(DurableEffectQueue.class);
        var delivery = mock(DeliverPushUseCase.class);
        var request = new PushRequest(NotificationType.EVENT_REMINDER, List.of(UUID.randomUUID()), Map.of(), "reminder:2", true,
                Instant.parse("2026-10-21T10:00:00Z"));
        new OutboxPushAdapter(queue).store(request, Duration.ZERO);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(queue).enqueue(eq("PUSH_NOTIFICATION"), eq("push:reminder:2"), payload.capture(), eq(Duration.ZERO));
        var handler = new PushEffectHandler(delivery);
        handler.execute("PUSH_NOTIFICATION", payload.getValue());
        verify(delivery).deliver(request);

        var older = new HashMap<>(payload.getValue());
        older.remove("deferrable");
        older.remove("expiresAt");
        handler.execute("PUSH_NOTIFICATION", older);
        verify(delivery).deliver(new PushRequest(request.type(), request.userIds(), request.data(), request.dedupeKey()));
    }

    @Test
    void theRegistryRendersKnownTypesAndRefusesOthersAndDuplicates() {
        PushTemplate reminder = template(NotificationType.EVENT_REMINDER);
        var registry = new PushTemplateRegistry(List.of(reminder));

        assertThat(registry.render(NotificationType.EVENT_REMINDER, NotificationLocale.ES, Map.of()).title()).isEqualTo("Title");
        assertThatThrownBy(() -> registry.render(NotificationType.NEWSLETTER, NotificationLocale.ES, Map.of()))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new PushTemplateRegistry(List.of(reminder, template(NotificationType.EVENT_REMINDER))))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void theProviderIsExpoOnlyWhenConfiguredAndTheLogProviderAcceptsWithSyntheticTickets() {
        var configuration = new PushConfiguration();
        var limiter = configuration.pushRateLimiter(500);
        var meters = new StaticListableBeanFactory(Map.of("meters", new SimpleMeterRegistry())).getBeanProvider(MeterRegistry.class);
        assertThat(configuration.pushSender(settings("expo", "token"), limiter, meters)).isInstanceOf(ExpoPushSenderAdapter.class);
        assertThat(configuration.pushSender(settings("expo", ""), limiter, meters)).isInstanceOf(ExpoPushSenderAdapter.class);
        PushSenderPort log = configuration.pushSender(settings("log", ""), limiter, meters);
        assertThat(log).isInstanceOf(LoggingPushSenderAdapter.class);
        var message = new PushSenderPort.Message("ExpoPushToken[a]", new PushContent("T", "B", "/"), true,
                NotificationType.EVENT_REMINDER, "key", null, false);
        var tickets = log.send(List.of(message, message));
        assertThat(tickets).hasSize(2).allSatisfy(ticket -> {
            assertThat(ticket.accepted()).isTrue();
            assertThat(ticket.id()).startsWith("log-");
            assertThat(ticket.deviceNotRegistered()).isFalse();
        });
        assertThat(tickets.get(0).id()).isNotEqualTo(tickets.get(1).id());
        assertThat(log.receipts(List.of(tickets.get(0).id()))).isEqualTo(Map.of(tickets.get(0).id(), new PushSenderPort.Receipt(true, null)));
        assertThatThrownBy(() -> configuration.pushRateLimiter(0)).isInstanceOf(IllegalArgumentException.class);
    }

    private static PushConfiguration.Settings settings(String provider, String token) {
        return new PushConfiguration().pushProviderSettings(provider, token, Duration.ofSeconds(3), Duration.ofSeconds(10), 3);
    }

    @Test
    void theRetentionSchedulerPurgesStaleDevices() {
        var useCase = mock(ManagePushDevicesUseCase.class);
        when(useCase.purgeStale()).thenReturn(2, 0);
        var scheduler = new PushDeviceRetentionScheduler(useCase);

        scheduler.purge();
        scheduler.purge();

        verify(useCase, times(2)).purgeStale();
    }

    @Test
    void theReceiptSchedulerAsksForTheCurrentBatch() {
        var useCase = mock(CheckPushReceiptsUseCase.class);
        new PushReceiptScheduler(useCase).check();
        verify(useCase).execute(any());
    }

    private static PushTemplate template(NotificationType type) {
        return new PushTemplate() {
            @Override
            public NotificationType type() {
                return type;
            }

            @Override
            public PushContent render(NotificationLocale locale, Map<String, String> data) {
                return new PushContent("Title", "Body", "/events");
            }
        };
    }
}
