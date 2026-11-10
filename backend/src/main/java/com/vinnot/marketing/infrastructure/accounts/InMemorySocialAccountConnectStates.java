package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.port.out.SocialAccountConnectStates;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OAuth states kept in this instance's memory (#510 S5): 256 random bits, ten minutes, removed on first use whatever the
 * outcome. A server-side store makes each state truly single-use and keeps it independent of the token encryption key;
 * the cost is that it only works with one backend instance (the low-cost deployment runs one) and a restart between
 * "connect" and the callback makes the admin start the connection again. At most {@value #MAX_PENDING} states wait at a
 * time; the oldest is dropped beyond that.
 */
public class InMemorySocialAccountConnectStates implements SocialAccountConnectStates {
    static final Duration LIFETIME = Duration.ofMinutes(10);
    static final int MAX_PENDING = 50;
    private static final int STATE_BYTES = 32;
    private final Map<String, Pending> pending = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Override
    public synchronized String issue(UUID adminId, SocialNetwork network, Instant now) {
        pending.values().removeIf(entry -> !entry.expiresAt().isAfter(now));
        while (pending.size() >= MAX_PENDING) {
            pending.entrySet().stream().min(Comparator.comparing(entry -> entry.getValue().expiresAt()))
                    .ifPresent(oldest -> pending.remove(oldest.getKey()));
        }
        byte[] bytes = new byte[STATE_BYTES];
        random.nextBytes(bytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        pending.put(state, new Pending(Objects.requireNonNull(adminId, "adminId"), network, now.plus(LIFETIME)));
        return state;
    }

    @Override
    public Optional<UUID> consume(String state, SocialNetwork network, Instant now) {
        if (Objects.isNull(state)) {
            return Optional.empty();
        }
        return Optional.ofNullable(pending.remove(state))
                .filter(entry -> entry.network() == network && entry.expiresAt().isAfter(now))
                .map(Pending::adminId);
    }

    int size() {
        return pending.size();
    }

    private record Pending(UUID adminId, SocialNetwork network, Instant expiresAt) {
    }
}
