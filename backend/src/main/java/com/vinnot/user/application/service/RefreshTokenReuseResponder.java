package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort.RefreshTokenData;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Answers a replayed refresh token (#482). A token that was already rotated, presented outside the idempotent
 * {@code rotationId} recovery, means two parties hold the same session: one of them stole it. Every session of the
 * account ends, so both must sign in again and only the owner can.
 *
 * <p>Parallel refreshes of the same token are not theft: the token row is locked while one of them rotates it, and the
 * others then find it rotated a moment ago. A replay within {@code grace} of the rotation is therefore only refused.
 */
@Service
public class RefreshTokenReuseResponder {
    static final String REUSE_REASON = "reuse";
    private static final Logger LOGGER = LoggerFactory.getLogger(RefreshTokenReuseResponder.class);

    private final UserRepositoryPort users;
    private final RefreshTokenRepositoryPort refreshTokens;
    private final ManagePushDevicesUseCase pushDevices;
    private final SecurityEventRecorder events;
    private final Duration grace;
    private final Clock clock;

    @Autowired
    public RefreshTokenReuseResponder(UserRepositoryPort users, RefreshTokenRepositoryPort refreshTokens,
            ManagePushDevicesUseCase pushDevices, SecurityEventRecorder events,
            @Value("${app.security.refresh-reuse.grace-period:PT30S}") Duration grace) {
        this(users, refreshTokens, pushDevices, events, grace, Clock.systemUTC());
    }

    RefreshTokenReuseResponder(UserRepositoryPort users, RefreshTokenRepositoryPort refreshTokens,
            ManagePushDevicesUseCase pushDevices, SecurityEventRecorder events, Duration grace, Clock clock) {
        if (grace.isNegative()) {
            throw new IllegalArgumentException("app.security.refresh-reuse.grace-period must not be negative");
        }
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.pushDevices = pushDevices;
        this.events = events;
        this.grace = grace;
        this.clock = clock;
    }

    /**
     * Commits on its own, because the refresh that called it fails and rolls back. It never touches the replayed
     * token's row, which the caller holds locked.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void replayed(RefreshTokenData rotated) {
        Instant rotatedAt = rotated.revokedAt();
        if (Objects.nonNull(rotatedAt) && rotatedAt.isAfter(clock.instant().minus(grace))) {
            return;
        }
        users.findById(rotated.userId()).ifPresent(user -> {
            user.endAllSessions();
            users.save(user);
        });
        if (Objects.nonNull(rotated.replacedByTokenHash())) {
            refreshTokens.revokeRotationChain(rotated.replacedByTokenHash(), REUSE_REASON);
        }
        pushDevices.forgetUser(rotated.userId());
        events.record(SecurityEventType.REFRESH_REUSE_DETECTED, rotated.userId());
        LOGGER.warn("Refresh token reuse detected; every session of the account was ended: userId={}", rotated.userId());
    }
}
