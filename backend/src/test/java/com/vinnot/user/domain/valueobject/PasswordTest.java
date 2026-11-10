package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordTest {

    @Test
    void acceptsStrongPlainPasswordsAndProtectsHashRendering() {
        assertThatCode(() -> Password.validatePlainPassword("StrongPass1"))
                .doesNotThrowAnyException();

        Password password = Password.fromHash("$2a$hash");
        assertThat(password.getHashedValue()).isEqualTo("$2a$hash");
        assertThat(password.toString()).isEqualTo("[PROTECTED]");
    }

    @Test
    void rejectsEveryMissingStrengthDimension() {
        assertWeak("Short1A");
        assertWeak("lowercase1");
        assertWeak("UPPERCASE1");
        assertWeak("NoDigitsHere");
    }

    private void assertWeak(String value) {
        assertThatThrownBy(() -> Password.validatePlainPassword(value))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("WEAK_PASSWORD");
    }
}
