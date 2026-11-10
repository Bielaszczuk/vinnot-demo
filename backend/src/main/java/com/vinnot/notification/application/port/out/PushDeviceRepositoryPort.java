package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushToken;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Where push devices are kept. */
public interface PushDeviceRepositoryPort {
    /** Inserts the device, or moves an existing token to this account and refreshes it (last seen, channel support). */
    void save(PushDevice device);

    void delete(UUID userId, PushToken token);

    void deleteAll(UUID userId);

    /** Removes tokens the push provider reported as no longer registered, whoever they belong to. */
    void deleteTokens(Collection<String> tokens);

    /** Removes devices last registered before {@code cutoff}; returns how many. */
    int deleteNotSeenSince(Instant cutoff);

    List<PushDevice> findByUsers(Collection<UUID> userIds);
}
