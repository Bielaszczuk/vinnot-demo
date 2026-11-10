package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.shared.infrastructure.http.DeadlineHttpRequestFactory;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.Duration;

/**
 * {@code app.notifications.push.provider}: {@code expo} sends through the Expo Push API, anything else (the default
 * {@code log}) only logs counts. The optional Expo access token is a secret from the environment. One
 * {@link PushRateLimiter} ({@code rate-per-second}, 500 by default, below Expo's 600 per second per project) is shared by
 * every send of this instance.
 */
@Configuration(proxyBeanMethods = false)
public class PushConfiguration {
    static final String EXPO_API = "https://exp.host/--/api/v2/push";
    private static final int BODY_LIMIT = 1024 * 1024;

    @Bean
    PushRateLimiter pushRateLimiter(@Value("${app.notifications.push.rate-per-second:500}") double perSecond) {
        return new PushRateLimiter(perSecond, System::nanoTime, Pause.SLEEP);
    }

    @Bean
    PushSenderPort pushSender(Settings settings, PushRateLimiter limiter, ObjectProvider<MeterRegistry> meters) {
        if (!"expo".equals(settings.provider())) {
            return new LoggingPushSenderAdapter();
        }
        RestClient.Builder builder = RestClient.builder().baseUrl(EXPO_API).requestFactory(
                new DeadlineHttpRequestFactory(settings.connectTimeout(), settings.readTimeout(), BODY_LIMIT, BODY_LIMIT));
        if (!settings.accessToken().isBlank()) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + settings.accessToken());
        }
        return new ExpoPushSenderAdapter(builder.build(), limiter, meters.getIfAvailable(SimpleMeterRegistry::new),
                Clock.systemUTC(), settings.retries(), Pause.SLEEP);
    }

    @Bean
    Settings pushProviderSettings(@Value("${app.notifications.push.provider:log}") String provider,
            @Value("${app.notifications.push.expo-access-token:}") String accessToken,
            @Value("${app.notifications.push.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.notifications.push.read-timeout:10s}") Duration readTimeout,
            @Value("${app.notifications.push.http-retries:3}") int retries) {
        return new Settings(provider, accessToken, connectTimeout, readTimeout, retries);
    }

    /** The provider choice and its HTTP settings; {@code retries} applies to {@code 429} and {@code 5xx} answers. */
    record Settings(String provider, String accessToken, Duration connectTimeout, Duration readTimeout, int retries) {
    }
}
