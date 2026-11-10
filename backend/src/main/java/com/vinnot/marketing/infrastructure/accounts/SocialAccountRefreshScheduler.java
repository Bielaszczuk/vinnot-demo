package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.port.in.RefreshSocialAccountsUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Refreshes the Threads and TikTok tokens that are about to expire, every hour by default (#510 S5). */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.marketing.enabled", havingValue = "true", matchIfMissing = true)
public class SocialAccountRefreshScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialAccountRefreshScheduler.class);
    private final RefreshSocialAccountsUseCase refresh;

    @Scheduled(initialDelayString = "${app.marketing.accounts.refresh.initial-delay-ms:120000}",
            fixedDelayString = "${app.marketing.accounts.refresh.delay-ms:3600000}")
    public void refreshDue() {
        int refreshed = refresh.refreshDue();
        if (refreshed > 0) {
            LOGGER.info("Refreshed {} social account token(s)", refreshed);
        }
    }
}
