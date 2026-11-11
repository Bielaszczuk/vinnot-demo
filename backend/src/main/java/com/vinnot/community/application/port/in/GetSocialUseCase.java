package com.vinnot.community.application.port.in;

import com.vinnot.community.application.query.response.FollowUserResponse;
import com.vinnot.community.application.query.response.PublicCellarWineResponse;
import com.vinnot.community.application.query.response.SocialProfileSummary;
import com.vinnot.community.application.query.response.SuggestedUserResponse;
import com.vinnot.community.application.query.response.UserReviewResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.List;
import java.util.UUID;

/**
 * Social reads (#541). Every read about a member answers not found when the member is missing, inactive or blocked
 * either way with the viewer.
 */
public interface GetSocialUseCase {
    PageResult<FollowUserResponse> followers(UUID viewer, UUID userId, int page, int size);

    PageResult<FollowUserResponse> following(UUID viewer, UUID userId, int page, int size);

    List<SuggestedUserResponse> suggestions(UUID viewer, int size);

    PageResult<UserReviewResponse> feed(UUID viewer, int page, int size);

    PageResult<UserReviewResponse> reviews(UUID viewer, UUID userId, int page, int size);

    /** The member's cellar; fails with {@code CELLAR_NOT_VISIBLE} when their setting hides it from the viewer. */
    PageResult<PublicCellarWineResponse> cellar(UUID viewer, UUID userId, int page, int size);

    /** The social part of a public profile; {@code viewer} may be {@code null}. */
    SocialProfileSummary profile(UUID viewer, UUID userId);
}
