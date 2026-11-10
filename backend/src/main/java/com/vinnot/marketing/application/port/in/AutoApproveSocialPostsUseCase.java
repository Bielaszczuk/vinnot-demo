package com.vinnot.marketing.application.port.in;

import java.time.Instant;

/** The system approves the eligible pending posts of auto-approving pillars (#510). */
public interface AutoApproveSocialPostsUseCase {

    /** Approves every eligible pending post; returns how many were approved. */
    int autoApprove(Instant now);
}
