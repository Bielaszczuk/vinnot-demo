package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PushPlanningServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-21T07:00:00Z");
    private final NotificationPreferenceRepositoryPort preferences = mock(NotificationPreferenceRepositoryPort.class);
    private final PushTypeSwitchPort switches = mock(PushTypeSwitchPort.class);
    private final PushPlanningService service = new PushPlanningService(preferences, switches, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void eachAccountGetsTheCategoriesItReceivesByPushReadInOneBatch() {
        UUID ana = UUID.randomUUID();
        UUID bruno = UUID.randomUUID();
        UUID carla = UUID.randomUUID();
        when(preferences.loadAll(List.of(ana, bruno, carla))).thenReturn(Map.of(
                ana, NotificationPreferences.defaults(),
                bruno, new NotificationPreferences(Map.of(
                        new NotificationPreferences.Choice(NotificationCategory.REMINDERS, NotificationChannel.PUSH), false,
                        new NotificationPreferences.Choice(NotificationCategory.REMINDERS, NotificationChannel.EMAIL), true),
                        MarketingConsent.none())));

        Map<UUID, Set<NotificationCategory>> categories = service.pushCategories(List.of(ana, bruno, carla));

        assertThat(categories.get(ana)).as("every category on by default (#347)").isEqualTo(EnumSet.allOf(NotificationCategory.class));
        assertThat(categories.get(bruno)).doesNotContain(NotificationCategory.REMINDERS).contains(NotificationCategory.RECOMMENDATIONS);
        assertThat(categories.get(carla)).as("absent from the batch: defaults").contains(NotificationCategory.REMINDERS);
        assertThat(service.pushCategories(List.of())).isEmpty();
    }

    @Test
    void switchedOffTypesComeFromTheAdministratorsSwitches() {
        when(switches.disabledTypes()).thenReturn(Set.of(NotificationType.WINBACK));
        assertThat(service.switchedOff()).containsExactly(NotificationType.WINBACK);
    }

    @Test
    void whenEachTypeWasLastTurnedBackOnComesFromTheSwitchAudit() {
        when(switches.lastTurnedOn()).thenReturn(Map.of(NotificationType.TASTE_PICK, NOW));
        assertThat(service.lastTurnedOn()).containsExactly(Map.entry(NotificationType.TASTE_PICK, NOW));
    }

    @Test
    void onlyEngagementTypesArePausedAutomaticallyAndTheChangeIsAudited() {
        when(switches.change(NotificationType.TASTE_PICK, false,
                new PushTypeSwitchPort.Actor(null, PushPlanningService.AUTO_PAUSE_ACTOR), NOW)).thenReturn(true);

        assertThat(service.pauseAutomatically(NotificationType.TASTE_PICK)).isTrue();
        verify(switches).change(NotificationType.TASTE_PICK, false, new PushTypeSwitchPort.Actor(null, PushPlanningService.AUTO_PAUSE_ACTOR), NOW);

        var other = mock(PushTypeSwitchPort.class);
        assertThatThrownBy(() -> new PushPlanningService(preferences, other).pauseAutomatically(NotificationType.EVENT_REMINDER))
                .isInstanceOf(DomainException.class);
        verifyNoInteractions(other);
    }
}
