package com.vinnot.shared.infrastructure.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AwsServiceClientConfigurationTest {
    @Test
    void appliesBoundedCallsAndSingleAttemptToBothClientsWithoutCallingAws() {
        var configuration = new AwsServiceClientConfiguration(Duration.ofSeconds(15), Duration.ofSeconds(12));
        try (var s3 = configuration.s3Client("us-east-1"); var ses = configuration.sesClient("us-east-1")) {
            var s3Policy = s3.serviceClientConfiguration().overrideConfiguration();
            var sesPolicy = ses.serviceClientConfiguration().overrideConfiguration();
            assertThat(s3Policy.apiCallTimeout()).contains(Duration.ofSeconds(15));
            assertThat(sesPolicy.apiCallTimeout()).contains(Duration.ofSeconds(15));
            assertThat(s3Policy.apiCallAttemptTimeout()).contains(Duration.ofSeconds(12));
            assertThat(sesPolicy.apiCallAttemptTimeout()).contains(Duration.ofSeconds(12));
            assertThat(s3Policy.retryStrategy().orElseThrow().maxAttempts()).isEqualTo(1);
            assertThat(sesPolicy.retryStrategy().orElseThrow().maxAttempts()).isEqualTo(1);
        }
    }

    @Test
    void rejectsInvalidNestedTimeBudgets() {
        assertThatThrownBy(() -> new AwsServiceClientConfiguration(Duration.ofSeconds(15), Duration.ofSeconds(9)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AwsServiceClientConfiguration(Duration.ofSeconds(10), Duration.ofSeconds(12)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AwsServiceClientConfiguration(Duration.ofSeconds(61), Duration.ofSeconds(12)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
