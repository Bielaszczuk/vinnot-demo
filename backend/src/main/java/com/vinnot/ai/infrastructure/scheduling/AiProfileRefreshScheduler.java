package com.vinnot.ai.infrastructure.scheduling;

import com.vinnot.ai.application.port.in.RefreshStaleAiProfilesUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Regenerates stale AI profiles in the background, a few per run, after a prompt change (#528).
 * Production runs one backend instance; with more replicas the shared generation lease and spending
 * ledger still prevent duplicate work and overspending, at worst wasting a skipped check.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "ai.profile-refresh.enabled", havingValue = "true", matchIfMissing = true)
public class AiProfileRefreshScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(AiProfileRefreshScheduler.class);
    private final RefreshStaleAiProfilesUseCase refresh;

    @Scheduled(
            initialDelayString = "${ai.profile-refresh.interval:2m}",
            fixedDelayString = "${ai.profile-refresh.interval:2m}")
    public void refreshStaleProfiles() {
        try {
            refresh.refreshStaleProfiles();
        } catch (RuntimeException exception) {
            LOGGER.warn("AI profile refresh run failed: {}: {}",
                    exception.getClass().getSimpleName(), exception.getMessage());
        }
    }
}
