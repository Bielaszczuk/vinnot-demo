package com.vinnot.user.infrastructure.config;

import com.vinnot.shared.infrastructure.http.DeadlineHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.web.client.RestOperations;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/** Bounded transports for social-token verification and account revocation. */
@Configuration(proxyBeanMethods = false)
public class SocialHttpConfiguration {
    private static final int MAXIMUM_BODY_BYTES = 1024 * 1024;

    private final Duration connectTimeout;
    private final Duration readTimeout;

    public SocialHttpConfiguration(
            @Value("${app.auth.social.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.auth.social.read-timeout:5s}") Duration readTimeout) {
        requirePositiveMillis(connectTimeout);
        requirePositiveMillis(readTimeout);
        this.connectTimeout = connectTimeout;
        this.readTimeout = readTimeout;
    }

    @Bean("socialRestClientBuilder")
    @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
    public RestClient.Builder socialRestClientBuilder() {
        return RestClient.builder().requestFactory(requestFactory());
    }

    @Bean("socialJwkRestOperations")
    public RestOperations socialJwkRestOperations() {
        return new RestTemplate(requestFactory());
    }

    private DeadlineHttpRequestFactory requestFactory() {
        return new DeadlineHttpRequestFactory(connectTimeout, readTimeout, MAXIMUM_BODY_BYTES, MAXIMUM_BODY_BYTES);
    }

    private static void requirePositiveMillis(Duration timeout) {
        if (timeout.toMillis() < 1 || timeout.toMillis() > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Social HTTP timeouts must fit positive milliseconds");
        }
    }
}
