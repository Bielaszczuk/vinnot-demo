package com.vinnot.shared.infrastructure.logging;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SafeFailureDetailsTest {

    @Test
    void preservesTypesAndCodeLocationWithoutMessagesOrSuppressedPayloads() {
        var cause = new IllegalArgumentException("token=secret recipient=private@example.com");
        var failure = new RuntimeException("https://provider.example/?key=private-key", cause);
        failure.addSuppressed(new Exception("private request body"));
        assertThat(SafeFailureDetails.describe(failure))
                .contains("java.lang.RuntimeException", "java.lang.IllegalArgumentException",
                        "SafeFailureDetailsTest.preservesTypesAndCodeLocation")
                .doesNotContain("secret", "private", "provider.example");
    }

    @Test
    void handlesCyclesLongChainsAndMissingLocations() {
        var first = new RuntimeException("secret");
        var second = new RuntimeException("secret", first);
        first.initCause(second);
        first.setStackTrace(new StackTraceElement[0]);
        second.setStackTrace(new StackTraceElement[0]);
        assertThat(SafeFailureDetails.describe(first))
                .isEqualTo("java.lang.RuntimeException <- java.lang.RuntimeException");
        Throwable chain = first;
        for (int index = 0; index < 10; index++) {
            chain = new RuntimeException("secret", chain);
        }
        assertThat(SafeFailureDetails.describe(chain).split(" <- ")).hasSize(5);
        assertThat(SafeFailureDetails.describe(null)).isEmpty();
    }
}
