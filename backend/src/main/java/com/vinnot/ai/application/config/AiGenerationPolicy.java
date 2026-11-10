package com.vinnot.ai.application.config;

import java.time.Duration;

/** Runtime policy consumed by AI orchestration without Spring configuration coupling. */
public record AiGenerationPolicy(
        Duration leaseDuration,
        Duration waitTimeout,
        Duration pollInterval
) {
}
