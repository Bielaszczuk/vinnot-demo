package com.vinnot.gamification.application.query.response;

/**
 * A member's points and the seal shown next to their name.
 *
 * @param points    current points
 * @param badgeTier the tier key, or {@code null} while the member is locked or inactive
 */
public record PointStanding(int points, String badgeTier) {
}
