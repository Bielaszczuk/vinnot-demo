package com.vinnot.admin.application.service;

import com.vinnot.admin.application.port.out.AppMinimumVersionPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import com.vinnot.shared.domain.exception.DomainException;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AppVersionAdministrationServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-26T12:00:00Z");
    private final AppMinimumVersionPort versions = mock(AppMinimumVersionPort.class);
    private final UserQueryPort users = mock(UserQueryPort.class);
    private final AppVersionAdministrationService service = new AppVersionAdministrationService(versions, users,
            Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID admin = UUID.randomUUID();

    @Test
    void settingsListBothPlatformsInOrderEvenWhenNeverChangedWithTheLatestTwentyChanges() {
        var android = new AppMinimumVersionPort.Setting(AppPlatform.ANDROID, new AppVersion(0, 3, 0), NOW, "admin@vinnot.test");
        var change = new AppMinimumVersionPort.Change(AppPlatform.ANDROID, null, new AppVersion(0, 3, 0), "admin@vinnot.test", NOW);
        when(versions.settings()).thenReturn(Map.of(AppPlatform.ANDROID, android));
        when(versions.recentChanges(20)).thenReturn(List.of(change));

        var settings = service.settings();

        assertThat(settings.platforms()).containsExactly(
                new AppMinimumVersionPort.Setting(AppPlatform.IOS, null, null, null), android);
        assertThat(settings.recentChanges()).containsExactly(change);
        assertThat(AppVersionAdministrationService.RECENT_CHANGES).isEqualTo(20);
    }

    @Test
    void aChangeIsStoredWithTheAdministratorsAddressAndTheCurrentTime() {
        when(users.findById(admin)).thenReturn(Optional.of(user("admin@vinnot.test")));

        service.setMinimumVersion(AppPlatform.IOS, "0.3.0", admin);
        service.setMinimumVersion(AppPlatform.ANDROID, null, admin);

        var actor = new AppMinimumVersionPort.Actor(admin, "admin@vinnot.test");
        verify(versions).change(AppPlatform.IOS, new AppVersion(0, 3, 0), actor, NOW);
        verify(versions).change(eq(AppPlatform.ANDROID), isNull(), eq(actor), eq(NOW));
    }

    @Test
    void anInvalidVersionOrAnUnknownAccountChangesNothing() {
        assertThatThrownBy(() -> service.setMinimumVersion(AppPlatform.IOS, "1.2", admin))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "INVALID_APP_VERSION");
        when(users.findById(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.setMinimumVersion(AppPlatform.IOS, "0.3.0", admin))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "ADMIN_NOT_FOUND");
        verifyNoInteractions(versions);
    }

    @Test
    void theProductionConstructorUsesTheSystemClock() {
        assertThat(new AppVersionAdministrationService(versions, users)).isNotNull();
    }

    private UserQueryPort.UserAdminData user(String email) {
        return new UserQueryPort.UserAdminData(admin, "admin", email, "A", "B", "ADMIN", true, false, null, true, null,
                null, NOW, NOW);
    }
}
