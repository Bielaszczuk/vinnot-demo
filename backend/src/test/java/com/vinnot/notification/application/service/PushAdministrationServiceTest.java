package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.application.port.out.PushMetricsPort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PushAdministrationServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-21T12:00:00Z");
    private final PushRendererPort renderer = mock(PushRendererPort.class);
    private final PushTypeSwitchPort switches = mock(PushTypeSwitchPort.class);
    private final PushMetricsPort metrics = mock(PushMetricsPort.class);
    private final NotificationRecipientDirectoryPort directory = mock(NotificationRecipientDirectoryPort.class);
    private final PushAdministrationService service = new PushAdministrationService(renderer, switches, metrics, directory,
            "log", Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID admin = UUID.randomUUID();

    @BeforeEach
    void pushedTypes() {
        when(renderer.types()).thenReturn(Set.of(NotificationType.EVENT_NEARBY, NotificationType.EVENT_REMINDER));
    }

    @Test
    void settingsListOnlyPushedTypesInDeclarationOrderWithTheirSwitchAndTheProvider() {
        when(switches.disabledTypes()).thenReturn(Set.of(NotificationType.EVENT_NEARBY));
        when(switches.recentChanges(20)).thenReturn(List.of());

        var settings = service.settings();

        assertThat(settings.provider()).isEqualTo("log");
        assertThat(settings.types()).extracting(type -> type.type().name() + ":" + type.enabled() + ":" + type.transactional())
                .containsExactly("EVENT_REMINDER:true:true", "EVENT_NEARBY:false:false");
        assertThat(settings.types().get(1).category()).isEqualTo(NotificationCategory.EVENTS_NEARBY);
    }

    @Test
    void aSwitchChangeIsAuditedWithTheAdministratorsAddress() {
        when(directory.findUser(admin)).thenReturn(Optional.of(new NotificationRecipientDirectoryPort.DirectoryUser(
                NotificationRecipient.address("admin@vinnot.test", "Admin"), NotificationLocale.ES)));

        service.setEnabled(NotificationType.EVENT_NEARBY, false, admin);

        verify(switches).change(NotificationType.EVENT_NEARBY, false, new PushTypeSwitchPort.Actor(admin, "admin@vinnot.test"), NOW);
    }

    @Test
    void onlyPushedTypesCanBeSwitchedAndOnlyByAKnownAccount() {
        assertThatThrownBy(() -> service.setEnabled(NotificationType.NEWSLETTER, false, admin))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "NOT_A_PUSH_TYPE");
        when(directory.findUser(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.setEnabled(NotificationType.EVENT_NEARBY, false, admin))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "ADMIN_NOT_FOUND");
        verifyNoInteractions(switches);
    }

    @Test
    void metricsCoverTheWindowWithTodayAndFillMissingOutcomesWithZero() {
        when(metrics.totalsSince(LocalDate.parse("2026-10-15")))
                .thenReturn(Map.of(NotificationType.EVENT_NEARBY, Map.of(PushOutcome.SENT, 4L)));

        var week = service.metrics(7);

        assertThat(week.from()).isEqualTo(LocalDate.parse("2026-10-15"));
        assertThat(week.types()).hasSize(2);
        var nearby = week.types().stream().filter(type -> type.type() == NotificationType.EVENT_NEARBY).findFirst().orElseThrow();
        assertThat(nearby.counts()).hasSize(PushOutcome.values().length).containsEntry(PushOutcome.SENT, 4L)
                .containsEntry(PushOutcome.FAILED, 0L);
        assertThat(service.metrics(1).from()).isEqualTo(LocalDate.parse("2026-10-21"));
        assertThatThrownBy(() -> service.metrics(3)).isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_METRICS_WINDOW");
    }
}
