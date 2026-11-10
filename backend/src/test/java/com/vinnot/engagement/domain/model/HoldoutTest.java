package com.vinnot.engagement.domain.model;

import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S12: the holdout is a deterministic share of accounts by a hash of their id. */
class HoldoutTest {
    @Test
    void theSameAccountAlwaysFallsInTheSameBucket() {
        UUID account = UUID.fromString("0f8fad5b-d9cb-469f-a165-70867728950e");
        assertThat(Holdout.bucket(account)).isEqualTo(Holdout.bucket(UUID.fromString(account.toString())))
                .isBetween(0, 99);
        assertThat(new Holdout(5).includes(account)).isEqualTo(new Holdout(5).includes(account));
    }

    @Test
    void aboutFivePercentOfAccountsAreHeldOutAndNoneAtZero() {
        long held = IntStream.range(0, 20_000).mapToObj(index -> UUID.nameUUIDFromBytes(("account-" + index).getBytes()))
                .filter(new Holdout(5)::includes).count();
        assertThat(held).isBetween(800L, 1200L);
        assertThat(IntStream.range(0, 1000).mapToObj(index -> UUID.randomUUID()).anyMatch(new Holdout(0)::includes)).isFalse();
        assertThat(IntStream.range(0, 1000).mapToObj(index -> UUID.randomUUID()).allMatch(new Holdout(100)::includes)).isTrue();
    }

    @Test
    void thePercentIsBetweenZeroAndAHundred() {
        assertThatThrownBy(() -> new Holdout(-1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Holdout(101)).isInstanceOf(IllegalArgumentException.class);
    }
}
