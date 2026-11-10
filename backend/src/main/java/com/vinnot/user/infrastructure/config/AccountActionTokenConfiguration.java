package com.vinnot.user.infrastructure.config;

import com.vinnot.user.application.config.AccountActionTokenPolicy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class AccountActionTokenConfiguration {

    @Bean
    public AccountActionTokenPolicy accountActionTokenPolicy(
            @Value("${app.auth.frontend-base-url}") String frontendBaseUrl,
            @Value("${app.auth.email-verification-token-minutes:1440}")
            long verificationMinutes,
            @Value("${app.auth.password-reset-token-minutes:60}") long resetMinutes,
            @Value("${app.auth.email-change-token-minutes:60}") long emailChangeMinutes) {
        return new AccountActionTokenPolicy(
                frontendBaseUrl,
                Duration.ofMinutes(verificationMinutes),
                Duration.ofMinutes(resetMinutes),
                Duration.ofMinutes(emailChangeMinutes));
    }
}
