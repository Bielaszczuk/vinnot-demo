package com.vinnot.community.application.query.response;

import com.vinnot.community.domain.model.TasteTraits;
import com.vinnot.community.domain.model.TasteTraits.Blend;
import com.vinnot.community.domain.model.TasteWheel.Entry;

import java.math.BigDecimal;
import java.util.List;

/**
 * The social part of a public profile (#541).
 *
 * @param tier            the seal key, or {@code null} when the member shows none
 * @param cellarCount     the cellar size, or {@code null} when the cellar is not visible to the viewer
 * @param following       whether the viewer follows the member
 * @param followsYou      whether the member follows the viewer
 * @param affinityPercent taste affinity with the viewer; {@code null} for oneself or when either rated fewer than five
 *                        wines
 * @param tasteWheel      up to eight grapes, eight wine types and eight regions of the member's rated wines, best
 *                        score first; {@code null} while the member rated fewer than five wines
 * @param tasteTraits     structure and aroma families of the liked wines, filled by a completed taste quiz where
 *                        data is missing and overridden per trait by the member's manual values; {@code null} while
 *                        the member rated fewer than five wines, has no completed quiz and adjusted nothing
 */
public record SocialProfileSummary(String tier, long followersCount, long followingCount, long reviewsCount,
        Long cellarCount, boolean cellarVisible, boolean following, boolean followsYou, Integer affinityPercent,
        List<TasteSlice> tasteWheel, TasteTraitsView tasteTraits) {

    /**
     * One slice of the wheel.
     *
     * @param kind       GRAPE, TYPE or REGION; the wheel shows one kind at a time
     * @param value      the grape key (lower case, no accents, Greek romanised), the type code or the region id
     * @param label      the text to show: the grape's usual spelling, the type code or the region name
     * @param score      the average rating of the wines behind the slice, 0 to 5
     * @param tone       the type code for a type, the dominant type of the grape's wines for a grape, {@code null}
     *                   for a region
     * @param ratedWines how many of the member's rated wines the slice comes from
     */
    public record TasteSlice(String kind, String value, String label, BigDecimal score, String tone, int ratedWines) {
        public static TasteSlice from(Entry entry) {
            return new TasteSlice(entry.kind().name(), entry.value(), entry.label(), entry.score(), entry.tone(),
                    entry.ratedWines());
        }
    }

    /**
     * The structure traits with enough wines and the aroma families, most shared first; where real data is missing a
     * completed taste quiz fills it, and {@code fromQuiz} says so. A manual value replaces its trait's score and sets
     * {@code adjusted}. Quiz scores, and manual ones without real data, report 0 wines.
     */
    public record TasteTraitsView(List<TraitScore> structure, List<FamilyShare> families, boolean fromQuiz) {
        public static TasteTraitsView from(Blend blend) {
            TasteTraits traits = blend.traits();
            return new TasteTraitsView(
                    traits.structure().stream()
                            .map(score -> new TraitScore(score.trait().name(), score.score(), score.wines(),
                                    score.adjusted()))
                            .toList(),
                    traits.families().stream()
                            .map(share -> new FamilyShare(share.family(), share.percent())).toList(),
                    blend.fromQuiz());
        }
    }

    /**
     * A trait (ACIDITY, BODY, TANNIN or SWEETNESS), its score from 0 to 100, the wines it comes from and whether the
     * score is the member's manual value.
     */
    public record TraitScore(String trait, int score, int wines, boolean adjusted) { }

    /** An aroma family (FRUIT, FLORAL, HERBAL, SPICE, OAK or MINERAL) and its share from 1 to 100. */
    public record FamilyShare(String family, int percent) { }
}
