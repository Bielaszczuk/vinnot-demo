package com.vinnot.user.domain.model;

import com.vinnot.user.domain.valueobject.SocialProvider;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record SocialIdentity(
        UUID id,
        UUID userId,
        SocialProvider provider,
        String providerSubject,
        String providerEmail,
        Instant createdAt,
        Instant updatedAt
) {
    public SocialIdentity {
        Objects.requireNonNull(id, "Identity id cannot be null");
        Objects.requireNonNull(userId, "User id cannot be null");
        Objects.requireNonNull(provider, "Provider cannot be null");
        Objects.requireNonNull(providerSubject, "Provider subject cannot be null");
        Objects.requireNonNull(createdAt, "Created at cannot be null");
        Objects.requireNonNull(updatedAt, "Updated at cannot be null");
    }

    public static SocialIdentity create(
            UUID userId, SocialProvider provider, String subject, String email) {
        Instant now = Instant.now();
        return new SocialIdentity(UUID.randomUUID(), userId, provider, subject, email, now, now);
    }
}
