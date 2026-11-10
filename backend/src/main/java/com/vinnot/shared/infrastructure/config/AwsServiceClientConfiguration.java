package com.vinnot.shared.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.retries.StandardRetryStrategy;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sqs.SqsClient;

import java.time.Duration;

/** Explicit transport budgets; ambiguous storage/email mutations are never automatically replayed. */
@Configuration
public class AwsServiceClientConfiguration {
    private static final Duration MAX_CALL_TIMEOUT = Duration.ofSeconds(60);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private final Duration callTimeout;
    private final Duration attemptTimeout;

    public AwsServiceClientConfiguration(
            @Value("${services.aws.call-timeout:15s}") Duration callTimeout,
            @Value("${services.aws.attempt-timeout:12s}") Duration attemptTimeout) {
        if (attemptTimeout.compareTo(Duration.ofSeconds(10)) < 0
                || callTimeout.compareTo(attemptTimeout) < 0
                || callTimeout.compareTo(MAX_CALL_TIMEOUT) > 0) {
            throw new IllegalArgumentException("AWS budgets require 10s <= attempt <= call <= 60s");
        }
        this.callTimeout = callTimeout;
        this.attemptTimeout = attemptTimeout;
    }

    @Bean(destroyMethod = "close")
    @ConditionalOnExpression("'${app.storage.provider:local}' == 's3' or '${app.storage.provider:local}' == 'r2'")
    public S3Client s3Client(@Value("${app.storage.s3.region}") String region) {
        return S3Client.builder().region(Region.of(region))
                .httpClientBuilder(transport()).overrideConfiguration(overrides()).build();
    }

    @Bean(destroyMethod = "close")
    @ConditionalOnProperty(name = "app.auth.email.provider", havingValue = "ses")
    public SesV2Client sesClient(@Value("${app.auth.email.ses-region:us-east-1}") String region) {
        return SesV2Client.builder().region(Region.of(region))
                .httpClientBuilder(transport()).overrideConfiguration(overrides()).build();
    }

    /** Reads the SES bounce and complaint queue; only built when one is configured. */
    @Bean(destroyMethod = "close")
    @ConditionalOnExpression("!'${app.notifications.feedback.queue-url:}'.isBlank()")
    public SqsClient sqsClient(@Value("${app.notifications.feedback.region:${app.auth.email.ses-region:us-east-1}}") String region) {
        return SqsClient.builder().region(Region.of(region))
                .httpClientBuilder(transport()).overrideConfiguration(overrides()).build();
    }

    private ApacheHttpClient.Builder transport() {
        return ApacheHttpClient.builder().connectionTimeout(CONNECT_TIMEOUT)
                .connectionAcquisitionTimeout(Duration.ofSeconds(2)).socketTimeout(Duration.ofSeconds(10))
                .maxConnections(20);
    }

    private ClientOverrideConfiguration overrides() {
        return ClientOverrideConfiguration.builder().apiCallTimeout(callTimeout)
                .apiCallAttemptTimeout(attemptTimeout)
                .retryStrategy(StandardRetryStrategy.builder().maxAttempts(1).build()).build();
    }
}
