package com.vinnot.winery.domain.valueobject;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContactInfoTest {

    @Test
    void detectsAvailableContactChannelsAndTreatsAllNullAsAbsent() {
        ContactInfo contact = ContactInfo.of("wine@example.com", " ", "https://wine.test");

        assertThat(contact.hasEmail()).isTrue();
        assertThat(contact.hasPhone()).isFalse();
        assertThat(contact.hasWebsite()).isTrue();
        assertThat(contact.toString()).contains("wine@example.com", "https://wine.test");
        assertThat(ContactInfo.of(null, null, null)).isNull();
    }
}
