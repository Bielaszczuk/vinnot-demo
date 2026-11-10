package com.vinnot.marketing.infrastructure.web.dto;

import jakarta.validation.constraints.NotNull;

/** Body of {@code PUT /admin/social-posts/pillars/{code}/auto-approve} and {@code .../active} (#510). */
public record PillarSwitchRequest(@NotNull Boolean enabled) { }
