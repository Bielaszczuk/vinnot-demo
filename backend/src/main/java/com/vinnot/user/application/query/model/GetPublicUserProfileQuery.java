package com.vinnot.user.application.query.model;

import java.util.UUID;

/** A member's public profile as {@code viewer} (possibly {@code null}) sees it. */
public record GetPublicUserProfileQuery(UUID viewer, UUID userId) { }
