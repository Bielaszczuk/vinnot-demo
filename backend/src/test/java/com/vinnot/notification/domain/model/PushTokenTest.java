package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PushTokenTest {
    @Test
    void acceptsBothExpoTokenPrefixesAndNeverPrintsTheToken() {
        assertThat(new PushToken("ExponentPushToken[abc-DEF_123]").value()).isEqualTo("ExponentPushToken[abc-DEF_123]");
        assertThat(new PushToken("ExpoPushToken[xyz]").toString()).doesNotContain("xyz");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "abc", "ExponentPushToken[]", "ExponentPushToken[a b]", "fcm:ExponentPushToken[abc]",
            "ExponentPushToken[abc]extra"})
    void rejectsAnythingThatIsNotAnExpoToken(String value) {
        assertThatThrownBy(() -> new PushToken(value)).isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_PUSH_TOKEN");
    }
}
