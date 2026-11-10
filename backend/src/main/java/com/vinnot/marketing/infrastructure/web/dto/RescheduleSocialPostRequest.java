package com.vinnot.marketing.infrastructure.web.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/** Body of {@code PUT /admin/social-posts/{id}/schedule} (#513 S5): the new time as an ISO-8601 instant; a missing one is a 400. */
public record RescheduleSocialPostRequest(@NotNull Instant scheduledFor) { }
