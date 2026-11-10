package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushPlatform;
import com.vinnot.notification.domain.model.PushToken;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class PushDeviceService implements ManagePushDevicesUseCase {
    private final PushDeviceRepositoryPort devices;
    private final Duration retention;
    private final Clock clock;

    @Autowired
    public PushDeviceService(PushDeviceRepositoryPort devices,
            @Value("${app.notifications.push.device-retention:120d}") Duration retention) {
        this(devices, retention, Clock.systemUTC());
    }

    PushDeviceService(PushDeviceRepositoryPort devices, Duration retention, Clock clock) {
        if (retention.isNegative() || retention.isZero()) {
            throw new IllegalArgumentException("app.notifications.push.device-retention must be positive");
        }
        this.devices = devices;
        this.retention = retention;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void register(UUID userId, String token, PushPlatform platform, NotificationLocale locale, boolean channels) {
        devices.save(new PushDevice(userId, new PushToken(token), platform, locale, clock.instant(), channels));
    }

    @Override
    @Transactional
    public void unregister(UUID userId, String token) {
        try {
            devices.delete(userId, new PushToken(token));
        } catch (DomainException invalid) {
            // A malformed token was never stored, so there is nothing to forget.
        }
    }

    @Override
    @Transactional
    public void forgetToken(String token) {
        try {
            devices.deleteTokens(List.of(new PushToken(token).value()));
        } catch (DomainException invalid) {
            // A malformed token was never stored, so there is nothing to forget.
        }
    }

    @Override
    @Transactional
    public void forgetUser(UUID userId) {
        devices.deleteAll(userId);
    }

    @Override
    @Transactional
    public int purgeStale() {
        return devices.deleteNotSeenSince(clock.instant().minus(retention));
    }
}
