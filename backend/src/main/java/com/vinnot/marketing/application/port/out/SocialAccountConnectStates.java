package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** The OAuth {@code state} values handed to the admin's browser (#510 S5): unguessable, single-use and short-lived. */
public interface SocialAccountConnectStates {

    /** A new state bound to the admin and the network, valid for ten minutes from {@code now}. */
    String issue(UUID adminId, SocialNetwork network, Instant now);

    /**
     * Uses the state up (whatever the outcome) and returns the admin who issued it, only when it exists, has not expired
     * and was issued for this network.
     */
    Optional<UUID> consume(String state, SocialNetwork network, Instant now);
}
