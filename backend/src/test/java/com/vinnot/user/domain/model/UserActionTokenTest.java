package com.vinnot.user.domain.model;

import com.vinnot.user.domain.valueobject.UserActionTokenType;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

class UserActionTokenTest {

    @Test
    void tokenIsUsableOnlyBeforeExpiryAndBeforeBeingConsumed() {
        Instant now = Instant.now();
        UserActionToken token = UserActionToken.create(
                UUID.randomUUID(), UserActionTokenType.EMAIL_VERIFICATION,
                "hash", now.plusSeconds(60), "new@example.com");

        assertThat(token.isUsableAt(now)).isTrue();
        assertThat(token.isUsableAt(now.plusSeconds(60))).isFalse();

        UserActionToken used = token.markUsed(now.plusSeconds(1));
        assertThat(used.isUsableAt(now.plusSeconds(2))).isFalse();
        assertThat(used.targetValue()).isEqualTo("new@example.com");
        assertThat(token.usedAt()).isNull();
    }

    @Test
    void enforcesMandatoryIdentityAndExpiration() {
        assertThatNullPointerException().isThrownBy(() -> new UserActionToken(
                null, UUID.randomUUID(), UserActionTokenType.PASSWORD_RESET,
                "hash", Instant.now(), null, Instant.now()));
    }
}
