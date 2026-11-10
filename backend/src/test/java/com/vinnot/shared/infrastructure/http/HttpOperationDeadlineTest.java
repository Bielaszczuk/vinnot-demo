package com.vinnot.shared.infrastructure.http;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.time.Duration;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HttpOperationDeadlineTest {
    @Test
    void boundsConfigurationAndRestoresNestedScopesWithoutLeakingAcrossRequests() throws Exception {
        for (Duration invalid : new Duration[]{Duration.ZERO, Duration.ofNanos(1),
                Duration.ofMillis(-1), Duration.ofSeconds(61)}) {
            assertThatThrownBy(() -> HttpOperationDeadline.start(invalid))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(HttpOperationDeadline.remaining(Duration.ofSeconds(2))).isEqualTo(Duration.ofSeconds(2));
        try (var outer = HttpOperationDeadline.start(Duration.ofMillis(60))) {
            try (var inner = HttpOperationDeadline.start(Duration.ofSeconds(10))) {
                assertThat(HttpOperationDeadline.remaining(Duration.ofSeconds(10))).isLessThan(Duration.ofMillis(61));
                inner.check();
            }
            try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
                assertThat(executor.submit(() -> HttpOperationDeadline.remaining(Duration.ofSeconds(3))).get())
                        .isEqualTo(Duration.ofSeconds(3));
            }
            Thread.sleep(70);
            assertThatThrownBy(outer::check).isInstanceOf(ResourceAccessException.class);
        }
        assertThat(HttpOperationDeadline.remaining(Duration.ofSeconds(3))).isEqualTo(Duration.ofSeconds(3));
    }
}
