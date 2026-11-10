package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Instant;

/** A stored OAuth account without its tokens (#510 S5), for the admin page. */
public record SocialAccountSummary(SocialNetwork network, String accountId, String displayName, SocialAccountStatus status,
        Instant accessExpiresAt, Instant refreshExpiresAt, String lastError, Instant connectedAt) {
}
