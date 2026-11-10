package com.vinnot.shared.domain.valueobject;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

class IdentifierTest {

    @Test
    void roundTripsUuidAndUsesValueEquality() {
        UUID value = UUID.randomUUID();

        assertThat(Identifier.fromString(value.toString()))
                .isEqualTo(Identifier.of(value));
        assertThat(Identifier.of(value).toString()).isEqualTo(value.toString());
        assertThat(Identifier.generate()).isNotEqualTo(Identifier.generate());
    }

    @Test
    void rejectsNullAndMalformedValues() {
        assertThatNullPointerException().isThrownBy(() -> Identifier.of(null));
        assertThatIllegalArgumentException().isThrownBy(
                () -> Identifier.fromString("not-a-uuid"));
    }
}
