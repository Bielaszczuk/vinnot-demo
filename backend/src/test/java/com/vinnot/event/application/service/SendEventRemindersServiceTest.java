package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventReminderStore;
import com.vinnot.event.application.port.out.EventReminderStore.Window;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

class SendEventRemindersServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-20T12:00:00Z");
    private final EventReminderStore store = mock(EventReminderStore.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final SendEventRemindersService service = new SendEventRemindersService(store, notifications, pushes);
    private final UUID ana = UUID.randomUUID();
    private final UUID bruno = UUID.randomUUID();

    @Test
    void aDayBeforeEachAttendeeGetsAnEmailAndAPushThatMayWaitButExpiresWhenTheSecondReminderTakesOver() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        Instant start = NOW.plusSeconds(20 * 3600);
        when(store.claimDue(Window.DAY_BEFORE, NOW.plusSeconds(3600), NOW.plusSeconds(24 * 3600), NOW, 200)).thenReturn(List.of(
                new EventReminderStore.DueReminder(first, ana, "ana@example.test", "en", "Tasting", start, "Europe/Madrid", "Bodega Norte"),
                new EventReminderStore.DueReminder(second, bruno, "bruno@example.test", "es", "Tasting", start, null, null)));
        soon();

        assertThat(service.execute(NOW)).isEqualTo(2);

        var captor = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(captor.capture());
        var reminder = captor.getAllValues().get(0);
        assertThat(reminder.type()).isEqualTo(NotificationType.EVENT_REMINDER);
        assertThat(reminder.recipient()).isEqualTo(NotificationRecipient.address("ana@example.test", null));
        assertThat(reminder.locale()).isEqualTo(NotificationLocale.EN);
        assertThat(reminder.dedupeKey()).as("the start time keeps a rescheduled event's email apart")
                .isEqualTo("reminder:" + first + ":24h:" + start.getEpochSecond());
        assertThat(reminder.data()).containsEntry("title", "Tasting").containsEntry("startDate", start.toString())
                .containsEntry("timeZone", "Europe/Madrid").containsEntry("venue", "Bodega Norte")
                .containsEntry("registrationId", first.toString()).doesNotContainKey("window");
        assertThat(captor.getAllValues().get(1).data()).containsEntry("timeZone", "UTC").doesNotContainKey("venue");

        var pushed = pushed(2);
        assertThat(pushed.get(0).userIds()).containsExactly(ana);
        assertThat(pushed.get(0).dedupeKey()).isEqualTo("reminder:" + first + ":24h:" + start.getEpochSecond());
        assertThat(pushed.get(0).deferrable()).isTrue();
        assertThat(pushed.get(0).expiresAt()).isEqualTo(start.minusSeconds(2 * 3600));
        assertThat(pushed.get(0).data()).containsEntry("window", "DAY_BEFORE").containsEntry("venue", "Bodega Norte");
    }

    @Test
    void aboutTwoHoursBeforeEachAttendeeGetsAnImmediatePushOnly() {
        UUID registration = UUID.randomUUID();
        Instant start = NOW.plusSeconds(90 * 60);
        dayBefore();
        when(store.claimDue(Window.SOON, NOW.plusSeconds(15 * 60), NOW.plusSeconds(2 * 3600), NOW, 200)).thenReturn(List.of(
                new EventReminderStore.DueReminder(registration, ana, "ana@example.test", "es", "Cata", start, "UTC", null)));

        assertThat(service.execute(NOW)).isEqualTo(1);

        verifyNoInteractions(notifications);
        var push = pushed(1).getFirst();
        assertThat(push.dedupeKey()).isEqualTo("reminder:" + registration + ":2h:" + start.getEpochSecond());
        assertThat(push.urgent()).isTrue();
        assertThat(push.expiresAt()).isEqualTo(start);
        assertThat(push.data()).containsEntry("window", "SOON").containsEntry("registrationId", registration.toString());
    }

    @Test
    void anEventCloserThanTwoHoursGetsTheDayBeforeEmailButLeavesThePushToTheSecondReminder() {
        UUID registration = UUID.randomUUID();
        when(store.claimDue(Window.DAY_BEFORE, NOW.plusSeconds(3600), NOW.plusSeconds(24 * 3600), NOW, 200)).thenReturn(List.of(
                new EventReminderStore.DueReminder(registration, ana, "ana@example.test", "es", "Cata", NOW.plusSeconds(90 * 60), "UTC", null)));
        soon();

        assertThat(service.execute(NOW)).isEqualTo(1);

        verify(notifications).enqueue(any());
        verifyNoInteractions(pushes);
    }

    @Test
    void nothingDueQueuesNothing() {
        dayBefore();
        soon();

        assertThat(service.execute(NOW)).isZero();
        verifyNoInteractions(notifications, pushes);
    }

    private void dayBefore() {
        when(store.claimDue(Window.DAY_BEFORE, NOW.plusSeconds(3600), NOW.plusSeconds(24 * 3600), NOW, 200)).thenReturn(List.of());
    }

    private void soon() {
        when(store.claimDue(Window.SOON, NOW.plusSeconds(15 * 60), NOW.plusSeconds(2 * 3600), NOW, 200)).thenReturn(List.of());
    }

    private List<PushRequest> pushed(int count) {
        var captor = ArgumentCaptor.forClass(PushRequest.class);
        verify(pushes, times(count)).push(captor.capture());
        return captor.getAllValues();
    }
}
