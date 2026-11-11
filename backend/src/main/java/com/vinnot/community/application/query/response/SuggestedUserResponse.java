package com.vinnot.community.application.query.response;

import java.util.UUID;

/**
 * A member suggested to follow.
 *
 * @param affinityPercent how close their taste is to the viewer's, or {@code null} while the viewer rated fewer than
 *                        five wines
 * @param reviewsCount    their approved reviews
 */
public record SuggestedUserResponse(UUID id, String username, String displayName, String avatarUrl, String tier,
        Integer affinityPercent, long reviewsCount) { }
