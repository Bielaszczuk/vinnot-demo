package com.vinnot.user.infrastructure.config;

import com.vinnot.user.domain.valueobject.LoginLockoutPolicy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/** The temporary sign-in lockout settings (#482); 5 failures and 15 minutes unless configured. */
@Configuration
public class LoginLockoutConfiguration {

    @Bean
    LoginLockoutPolicy loginLockoutPolicy(
            @Value("${app.security.login-lockout.max-failures:5}") int maxFailures,
            @Value("${app.security.login-lockout.lock-duration:PT15M}") Duration lockDuration) {
        return new LoginLockoutPolicy(maxFailures, lockDuration);
    }
}
