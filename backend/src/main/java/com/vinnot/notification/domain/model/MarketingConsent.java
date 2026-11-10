package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.time.Instant;
import java.util.Objects;

/**
 * The user's marketing consent. Promotions are on by default (#347): {@code none()} is an account that never decided,
 * which counts as granted until it revokes. A recorded decision always has its time and source.
 */
public record MarketingConsent(boolean granted, Instant decidedAt, ConsentSource source) {

    public MarketingConsent {
        if (Objects.isNull(decidedAt) != Objects.isNull(source)) {
            throw new DomainException("INVALID_MARKETING_CONSENT", "A consent decision needs its time and source");
        }
        if (!granted && Objects.isNull(decidedAt)) {
            throw new DomainException("INVALID_MARKETING_CONSENT", "A revoked consent needs its time and source");
        }
    }

    public static MarketingConsent none() {
        return new MarketingConsent(true, null, null);
    }

    /** Whether the user recorded a decision, as opposed to keeping the default. */
    public boolean decided() {
        return Objects.nonNull(decidedAt);
    }
}
