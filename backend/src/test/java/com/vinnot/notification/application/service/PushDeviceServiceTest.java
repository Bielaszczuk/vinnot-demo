package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushPlatform;
import com.vinnot.notification.domain.model.PushToken;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class PushDeviceServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-20T12:00:00Z");
    private final PushDeviceRepositoryPort devices = mock(PushDeviceRepositoryPort.class);
    private final PushDeviceService service = new PushDeviceService(devices, Duration.ofDays(120), Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID user = UUID.randomUUID();

    @Test
    void registeringStoresTheDeviceSeenNowWithItsChannelSupport() {
        service.register(user, "ExponentPushToken[abc]", PushPlatform.IOS, NotificationLocale.EN, false);
        service.register(user, "ExponentPushToken[new]", PushPlatform.ANDROID, NotificationLocale.ES, true);

        verify(devices).save(new PushDevice(user, new PushToken("ExponentPushToken[abc]"), PushPlatform.IOS, NotificationLocale.EN, NOW, false));
        verify(devices).save(new PushDevice(user, new PushToken("ExponentPushToken[new]"), PushPlatform.ANDROID, NotificationLocale.ES, NOW, true));
    }

    @Test
    void devicesNotRegisteredForTheRetentionAreForgotten() {
        when(devices.deleteNotSeenSince(NOW.minus(Duration.ofDays(120)))).thenReturn(4);

        assertThat(service.purgeStale()).isEqualTo(4);
        assertThatThrownBy(() -> new PushDeviceService(devices, Duration.ZERO, Clock.systemUTC()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aTokenIsForgottenWhoeverItBelongsToAndAMalformedOneIsIgnored() {
        service.forgetToken("ExpoPushToken[abc]");
        service.forgetToken("not-a-token");

        verify(devices).deleteTokens(List.of("ExpoPushToken[abc]"));
        verifyNoMoreInteractions(devices);
    }

    @Test
    void aMalformedTokenIsRejectedOnRegisterAndIgnoredOnUnregister() {
        assertThatThrownBy(() -> service.register(user, "not-a-token", PushPlatform.ANDROID, NotificationLocale.ES, false))
                .isInstanceOf(DomainException.class);
        service.unregister(user, "not-a-token");

        verifyNoInteractions(devices);
    }

    @Test
    void unregisteringAndForgettingRemoveOnlyThatAccountsDevices() {
        service.unregister(user, "ExpoPushToken[abc]");
        service.forgetUser(user);

        verify(devices).delete(user, new PushToken("ExpoPushToken[abc]"));
        verify(devices).deleteAll(user);
    }
}
