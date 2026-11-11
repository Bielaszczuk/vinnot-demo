package com.vinnot.community.application.query.response;

import com.vinnot.community.application.port.out.SocialQueryPort.MemberRow;
import com.vinnot.community.domain.model.PublicName;

import java.util.UUID;

/**
 * A member in a followers or following list.
 *
 * @param avatarUrl the profile photo URL clients load, or {@code null} without one
 * @param tier      the seal key, or {@code null} when the member shows none
 * @param following whether the viewer follows this member
 */
public record FollowUserResponse(UUID id, String username, String displayName, String avatarUrl, String tier,
        boolean following) {
    public static FollowUserResponse from(MemberRow row, String avatarUrl, String tier) {
        return new FollowUserResponse(row.id(), row.username(),
                PublicName.of(row.username(), row.firstName(), row.lastName()), avatarUrl, tier,
                row.viewerFollows());
    }
}
