package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.AutoApproveSocialPostsUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Approves the eligible pending posts of auto-approving pillars every 15 minutes by default (#510). Off unless both
 * {@code app.marketing.enabled} and {@code app.marketing.auto-approve.enabled} are true.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("${app.marketing.enabled:true} and ${app.marketing.auto-approve.enabled:false}")
public class SocialAutoApproveScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialAutoApproveScheduler.class);
    private final AutoApproveSocialPostsUseCase autoApprove;

    @Scheduled(initialDelayString = "${app.marketing.auto-approve.delay-ms:900000}",
            fixedDelayString = "${app.marketing.auto-approve.delay-ms:900000}")
    public void approveEligible() {
        int approved = autoApprove.autoApprove(Instant.now());
        if (approved > 0) {
            LOGGER.info("Approved {} social post(s) automatically", approved);
        }
    }
}
