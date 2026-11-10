package com.vinnot.shared.domain.valueobject;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ResourceReaderTest {
    @Test
    void distinguishesPublicStaffOwnerAndUnrelatedReaders() {
        UUID owner = UUID.randomUUID();
        assertThat(ResourceReader.anonymous().mayRead(true, owner)).isTrue();
        assertThat(ResourceReader.anonymous().mayRead(false, null)).isFalse();
        assertThat(ResourceReader.staff().mayRead(false, owner)).isTrue();
        assertThat(new ResourceReader(owner, false).mayRead(false, owner)).isTrue();
        assertThat(new ResourceReader(UUID.randomUUID(), false).mayRead(false, owner)).isFalse();
    }
}
