package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UsernameTest {

    @Test
    void normalizesAValidUsername() {
        assertThat(Username.of("  Wine.Lover-01  ").getValue())
                .isEqualTo("wine.lover-01");
    }

    @Test
    void rejectsInvalidCharactersAndBoundaries() {
        assertThatThrownBy(() -> Username.of("_invalid"))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_USERNAME");
        assertThatThrownBy(() -> Username.of("invalid_"))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_USERNAME");
        assertThatThrownBy(() -> Username.of("ab"))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_USERNAME");
        assertThatThrownBy(() -> Username.of(null))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_USERNAME");
    }
}
