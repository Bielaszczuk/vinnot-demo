package com.vinnot.user.application.query.response;

import com.vinnot.user.application.port.out.SocialProfilePort.SocialProfile;
import com.vinnot.user.application.port.out.SocialProfilePort.TasteSlice;
import com.vinnot.user.application.port.out.SocialProfilePort.TasteTraits;
import com.vinnot.user.domain.model.User;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * What any signed-in member sees on another member's profile. The first six fields predate #541; the social fields
 * follow. Email, phone and the cellar setting itself are never part of it.
 *
 * @param cellarCount     the cellar size, or {@code null} when the cellar is not visible to the viewer
 * @param affinityPercent taste affinity with the viewer; {@code null} for oneself or when either rated fewer than five
 *                        wines
 * @param tasteWheel      up to eight grapes, eight wine types and eight regions, each with its tone and rated wines;
 *                        {@code null} while the member rated fewer than five wines
 * @param tasteTraits     structure and aroma families of the wines the member liked, filled by their taste quiz where
 *                        data is missing ({@code fromQuiz}) and overridden per trait by their manual values
 *                        ({@code adjusted}); {@code null} while the member rated fewer than five wines, has no
 *                        completed quiz and adjusted nothing. The quiz answers themselves are never part of it.
 */
public record PublicUserProfileResponse(
        UUID id,
        String username,
        String fullName,
        String avatarUrl,
        Set<String> roles,
        Instant createdAt,
        String bio,
        String tier,
        long followersCount,
        long followingCount,
        long reviewsCount,
        Long cellarCount,
        boolean cellarVisible,
        boolean following,
        boolean followsYou,
        Integer affinityPercent,
        List<TasteSlice> tasteWheel,
        TasteTraits tasteTraits
) {
    /** @param avatarUrl the profile photo URL clients load, or {@code null} without one */
    public static PublicUserProfileResponse of(User user, String avatarUrl, SocialProfile social) {
        return new PublicUserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                avatarUrl,
                user.getRoles().stream().map(role -> "ROLE_" + role.name()).collect(Collectors.toSet()),
                user.getCreatedAt(),
                user.getBio(),
                social.tier(),
                social.followersCount(),
                social.followingCount(),
                social.reviewsCount(),
                social.cellarCount(),
                social.cellarVisible(),
                social.following(),
                social.followsYou(),
                social.affinityPercent(),
                social.tasteWheel(),
                social.tasteTraits());
    }
}
