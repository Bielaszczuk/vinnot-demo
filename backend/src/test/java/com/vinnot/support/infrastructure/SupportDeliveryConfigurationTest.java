package com.vinnot.support.infrastructure;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SupportDeliveryConfigurationTest {
    @Test
    void failsClosedWithoutRealProviderOrDestination() {
        assertThatThrownBy(() -> new SupportDeliveryConfiguration("a@b.org", "log", "from@b.org").requireRecipient()).hasMessageContaining("unavailable");
        assertThatThrownBy(() -> new SupportDeliveryConfiguration("bad\naddress", "ses", "from@b.org").requireRecipient()).hasMessageContaining("unavailable");
        assertThat(new SupportDeliveryConfiguration("a@b.org", "ses", "from@b.org").requireRecipient()).isEqualTo("a@b.org");
    }

    @Test
    void rejectsBlankOrInjectedSenderBeforeAcceptingRequest() {
        for (String sender : new String[] {"", " ", "a@b.org\rBcc:x@y.org", "a@b.org\nBcc:x@y.org"}) {
            assertThatThrownBy(() -> new SupportDeliveryConfiguration("a@b.org", "ses", sender).requireRecipient())
                    .hasMessageContaining("unavailable");
        }
    }
}
