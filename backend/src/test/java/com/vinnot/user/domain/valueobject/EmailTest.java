package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailTest {

    @Test
    void normalizesCaseAndWhitespaceForIdentityEquality() {
        Email normalized = Email.of(" User+wine@Example.COM ");

        assertThat(normalized.getValue()).isEqualTo("user+wine@example.com");
        assertThat(normalized).isEqualTo(Email.of("user+wine@example.com"));
        assertThat(normalized.toString()).isEqualTo("user+wine@example.com");
    }

    @Test
    void rejectsBlankAndMalformedAddresses() {
        assertThatThrownBy(() -> Email.of(" "))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_EMAIL");
        assertThatThrownBy(() -> Email.of("missing-domain"))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_EMAIL");
    }
}
