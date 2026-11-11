package com.vinnot.review.application.query.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.review.application.port.out.ReviewerBadgePort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.application.query.response.ReviewCommentResponse;
import com.vinnot.review.application.query.response.ReviewResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewerInfoResolver {

    private final UserQueryPort userQueryPort;
    private final ReviewerBadgePort badges;
    private final AvatarUrlResolver avatars;

    /**
     * Builds reviewer info for a review response.
     *
     * @param userId the user ID
     * @return the reviewer info, or null if user not found
     */
    public ReviewResponse.ReviewerInfo resolveForReview(UUID userId) {
        return userQueryPort.findById(userId)
                .map(user -> {
                    String displayName = displayName(user);
                    return new ReviewResponse.ReviewerInfo(
                            user.id(),
                            user.username(),
                            displayName,
                            avatars.resolve(user.profileImageUrl()),
                            0,
                            badgeTier(user.id())
                    );
                })
                .orElse(null);
    }

    /**
     * Builds reviewer info for a comment response.
     *
     * @param userId the user ID
     * @return the reviewer info, or null if user not found
     */
    public ReviewCommentResponse.ReviewerInfo resolveForComment(UUID userId) {
        return userQueryPort.findById(userId)
                .map(user -> {
                    String displayName = displayName(user);
                    return new ReviewCommentResponse.ReviewerInfo(
                            user.id(),
                            user.username(),
                            displayName,
                            avatars.resolve(user.profileImageUrl()),
                            badgeTier(user.id())
                    );
                })
                .orElse(null);
    }

    private String badgeTier(UUID userId) {
        return badges.badgeTiers(List.of(userId)).get(userId);
    }

    static String displayName(UserQueryPort.UserData user) {
        return user.publicName();
    }
}
