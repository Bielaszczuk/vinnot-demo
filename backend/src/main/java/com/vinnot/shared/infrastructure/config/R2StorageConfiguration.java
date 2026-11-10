package com.vinnot.shared.infrastructure.config;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.infrastructure.storage.S3FileStorageService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.retries.StandardRetryStrategy;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import java.net.URI;
import java.time.Duration;

@Configuration
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "r2")
public class R2StorageConfiguration {
    private static final int CONNECT_SECONDS = 3;
    private static final int CONNECTIONS = 8;
    private static final int CALL_SECONDS = 15;
    private static final int ATTEMPT_SECONDS = 12;
    @Bean(destroyMethod = "close")
    public S3Client r2Client(@Value("${app.storage.r2.account-id}") String account,
            @Value("${app.storage.r2.access-key-id}") String access,
            @Value("${app.storage.r2.secret-access-key}") String secret) {
        if (!account.matches("[a-f0-9]{32}") || access.isBlank() || secret.isBlank()) {
            throw new IllegalArgumentException("R2 credentials/account are required");
        }
        return S3Client.builder().region(Region.of("auto"))
                .endpointOverride(URI.create("https://" + account + ".r2.cloudflarestorage.com"))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(access, secret)))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).chunkedEncodingEnabled(false).build())
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .httpClientBuilder(ApacheHttpClient.builder().connectionTimeout(Duration.ofSeconds(CONNECT_SECONDS))
                        .connectionAcquisitionTimeout(Duration.ofSeconds(2)).socketTimeout(Duration.ofSeconds(10)).maxConnections(CONNECTIONS))
                .overrideConfiguration(ClientOverrideConfiguration.builder().apiCallTimeout(Duration.ofSeconds(CALL_SECONDS))
                        .apiCallAttemptTimeout(Duration.ofSeconds(ATTEMPT_SECONDS))
                        .retryStrategy(StandardRetryStrategy.builder().maxAttempts(1).build()).build()).build();
    }

    @Bean("legacyFileStorage")
    public FileStoragePort legacyFileStorage(@Qualifier("s3Client") S3Client s3,
            @Value("${app.storage.s3.bucket}") String bucket,
            @Value("${app.storage.s3.avatar-prefix:avatars}") String avatars,
            @Value("${app.storage.s3.wine-label-prefix:wine-labels}") String labels,
            @Value("${app.storage.s3.wine-label-quarantine-prefix:wine-label-quarantine}") String quarantine) {
        return new S3FileStorageService(s3, bucket, avatars, labels, quarantine);
    }
}
