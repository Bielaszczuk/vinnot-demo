package com.vinnot.user.application.port.out;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** The social part of a public profile (#541): follows, seal, counters, cellar access and taste. */
public interface SocialProfilePort {
    /**
     * @param viewer the member looking, or {@code null}
     * @param userId the profile's member, who exists and is active
     */
    SocialProfile profile(UUID viewer, UUID userId);

    record SocialProfile(String tier, long followersCount, long followingCount, long reviewsCount, Long cellarCount,
            boolean cellarVisible, boolean following, boolean followsYou, Integer affinityPercent,
            List<TasteSlice> tasteWheel, TasteTraits tasteTraits) { }

    /**
     * One slice of the taste wheel: {@code kind} GRAPE, TYPE or REGION, the grape key, type code or region id, the text
     * to show, the average rating 0-5, the type code that colours it ({@code null} for a region) and the rated wines
     * it comes from.
     */
    record TasteSlice(String kind, String value, String label, BigDecimal score, String tone, int ratedWines) { }

    /**
     * Structure traits (score 0-100, the wines it comes from, and {@code adjusted} when the score is the member's
     * manual value) and aroma families (share 1-100) of liked wines; {@code fromQuiz} when any shown value came from
     * the member's taste quiz because real data was missing.
     */
    record TasteTraits(List<TraitScore> structure, List<FamilyShare> families, boolean fromQuiz) { }

    record TraitScore(String trait, int score, int wines, boolean adjusted) { }

    record FamilyShare(String family, int percent) { }
}
