package com.vinnot.user.application.config;

import java.time.Duration;

/** Account-link and token lifetimes supplied by the infrastructure composition root. */
public record AccountActionTokenPolicy(
        String frontendBaseUrl,
        Duration verificationLifetime,
        Duration resetLifetime,
        Duration emailChangeLifetime
) {
}
