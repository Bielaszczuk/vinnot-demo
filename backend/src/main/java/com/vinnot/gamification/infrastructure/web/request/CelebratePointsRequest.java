package com.vinnot.gamification.infrastructure.web.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;

import java.util.Objects;

/**
 * {@code POST /users/me/points/celebrations}: {@code { tier }} marks that tier and every lower one as celebrated,
 * {@code { welcome: true }} dismisses the welcome card; both may come together.
 *
 * @param tier    a tier key, or null
 * @param welcome whether the welcome card was dismissed
 */
public record CelebratePointsRequest(
        @Pattern(regexp = "BROTE|PARRA|RACIMO|VENDIMIA|LAGAR|BARRICA|CRIANZA|RESERVA|GRAN_RESERVA|GRAN_ENOFILO|VINNOT",
                message = "must be a tier key") String tier,
        Boolean welcome) {

    @AssertTrue(message = "a tier or welcome is required")
    public boolean isActionable() {
        return Objects.nonNull(tier) || Boolean.TRUE.equals(welcome);
    }
}
