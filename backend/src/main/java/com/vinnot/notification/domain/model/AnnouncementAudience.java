package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Who an announcement is for (#310): the channels, and optionally one language, one region or one country (the
 * members' "events near you" region, or any region of that country) and one role. With both a region and a country,
 * a member's region must be that region and belong to that country, so a region of another country matches nobody.
 * Only active, unsuspended accounts are ever included.
 */
public record AnnouncementAudience(boolean email, boolean push, String language, UUID regionId, UUID countryId,
        String role) {
    public static final Set<String> LANGUAGES = Set.of("es", "en");
    public static final Set<String> ROLES = Set.of("PARTNER", "MODERATOR", "ADMIN");

    public AnnouncementAudience {
        if (!email && !push) {
            throw new DomainException("ANNOUNCEMENT_CHANNEL_REQUIRED", "Choose email, push or both");
        }
        if (Objects.nonNull(language) && !LANGUAGES.contains(language)) {
            throw new DomainException("INVALID_ANNOUNCEMENT_AUDIENCE", "Unknown language: " + language);
        }
        if (Objects.nonNull(role) && !ROLES.contains(role)) {
            throw new DomainException("INVALID_ANNOUNCEMENT_AUDIENCE", "Unknown role: " + role);
        }
    }
}
