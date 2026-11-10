package com.vinnot.shared.application.command;

import com.vinnot.shared.domain.exception.DomainException;
import java.util.Set;
import org.junit.jupiter.api.Test;
import java.util.HashSet;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FieldUpdatesTest {
    @Test
    void distinguishesOmissionClearAndExplicitZero() {
        FieldUpdates keep = new FieldUpdates(null, Set.of("score"));
        assertThat(keep.resolve("score", null, 80)).isEqualTo(80);
        assertThat(keep.resolve("score", 0, 80)).isZero();
        assertThat(keep.changes("score", null)).isFalse();
        var invalidFields = new HashSet<String>();
        invalidFields.add(null);
        assertThatThrownBy(() -> new FieldUpdates(invalidFields, Set.of("score"))).isInstanceOf(DomainException.class);
        FieldUpdates clear = new FieldUpdates(Set.of("score"), Set.of("score"));
        assertThat(clear.resolve("score", null, 80)).isNull();
        assertThat(clear.changes("score", null)).isTrue();
        assertThatThrownBy(() -> clear.resolve("score", 10, 80)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> new FieldUpdates(Set.of("id"), Set.of("score"))).isInstanceOf(DomainException.class);
    }
}
