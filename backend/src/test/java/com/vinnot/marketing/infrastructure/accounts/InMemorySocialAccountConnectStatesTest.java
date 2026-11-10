package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** #510 S5: an OAuth state is unguessable, single-use, valid ten minutes and bound to its admin and network. */
class InMemorySocialAccountConnectStatesTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");
    private final InMemorySocialAccountConnectStates states = new InMemorySocialAccountConnectStates();
    private final UUID admin = UUID.randomUUID();

    @Test
    void aStateIsLongRandomAndReturnsItsAdminOnce() {
        String state = states.issue(admin, SocialNetwork.TIKTOK, NOW);

        assertThat(state).hasSize(43).matches("[A-Za-z0-9_-]+");
        assertThat(states.issue(admin, SocialNetwork.TIKTOK, NOW)).isNotEqualTo(state);
        assertThat(states.consume(state, SocialNetwork.TIKTOK, NOW.plusSeconds(60))).contains(admin);
        assertThat(states.consume(state, SocialNetwork.TIKTOK, NOW.plusSeconds(61))).isEmpty();
    }

    @Test
    void aStateExpiresAfterTenMinutes() {
        String state = states.issue(admin, SocialNetwork.THREADS, NOW);

        assertThat(states.consume(state, SocialNetwork.THREADS, NOW.plus(InMemorySocialAccountConnectStates.LIFETIME))).isEmpty();
    }

    @Test
    void aStateOnlyWorksForItsNetworkAndATryOnAnotherOneBurnsIt() {
        String state = states.issue(admin, SocialNetwork.THREADS, NOW);

        assertThat(states.consume(state, SocialNetwork.TIKTOK, NOW)).isEmpty();
        assertThat(states.consume(state, SocialNetwork.THREADS, NOW)).isEmpty();
    }

    @Test
    void unknownOrMissingStatesAreRefused() {
        assertThat(states.consume("forged", SocialNetwork.THREADS, NOW)).isEmpty();
        assertThat(states.consume(null, SocialNetwork.THREADS, NOW)).isEmpty();
    }

    @Test
    void expiredStatesAreDroppedAndPendingOnesAreCapped() {
        states.issue(admin, SocialNetwork.THREADS, NOW);
        states.issue(admin, SocialNetwork.THREADS, NOW.plus(InMemorySocialAccountConnectStates.LIFETIME));
        assertThat(states.size()).isEqualTo(1);

        Set<String> issued = new HashSet<>();
        for (int index = 0; index < InMemorySocialAccountConnectStates.MAX_PENDING + 5; index++) {
            issued.add(states.issue(admin, SocialNetwork.TIKTOK, NOW.plus(InMemorySocialAccountConnectStates.LIFETIME).plusSeconds(index)));
        }

        assertThat(states.size()).isEqualTo(InMemorySocialAccountConnectStates.MAX_PENDING);
        assertThat(issued).hasSize(InMemorySocialAccountConnectStates.MAX_PENDING + 5);
    }
}
