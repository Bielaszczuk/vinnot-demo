package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Instant;

/**
 * One network's connection for the admin page (#510 S5 C5), never with a token. {@code mode} says whether the network
 * is set up by secrets (Meta) or connected from the admin with OAuth. {@code expiresAt} is when the connection stops
 * working unless it is refreshed: the TikTok refresh token's end, the Threads token's end, null for Meta. {@code status}
 * is null while nothing is connected.
 */
public record SocialAccountResponse(SocialNetwork network, Mode mode, boolean configured, boolean connected, String accountId,
        String displayName, SocialAccountStatus status, Instant expiresAt, String lastError) {

    /** How a network is connected. */
    public enum Mode { CONFIG, OAUTH }
}
