package com.vinnot.community.application.port.out;

import com.vinnot.community.domain.model.CellarVisibility;
import com.vinnot.community.domain.model.TasteScore;
import com.vinnot.community.domain.model.TasteTrait;
import com.vinnot.community.domain.model.TasteWheel.CatalogGrape;
import com.vinnot.community.domain.model.TasteWheel.RatedWine;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads of the social profile (#541). Members in lists are active ones; lists that depend on a viewer leave out the
 * members the viewer blocked or who blocked the viewer. Reviews are approved ones on active wines.
 */
public interface SocialQueryPort {
    boolean isActiveMember(UUID userId);

    /** Facts about an active member as the viewer sees them; empty when the member is missing or inactive. */
    Optional<MemberFacts> memberFacts(UUID userId, UUID viewer);

    /** Followers of the member, newest follow first. */
    PageResult<MemberRow> followers(UUID userId, UUID viewer, PageQuery page);

    /** Members the member follows, newest follow first. */
    PageResult<MemberRow> following(UUID userId, UUID viewer, PageQuery page);

    /**
     * Active members with at least {@code minRatedWines} rated wines whom the viewer does not follow, excluding the
     * viewer and blocks either way, ranked by taste affinity (when the viewer's own taste counts) and then by reviews.
     */
    List<SuggestionRow> suggestions(UUID viewer, boolean rankByAffinity, int minRatedWines, int limit);

    /** Reviews by the members the viewer follows, newest first. */
    PageResult<ReviewRow> feed(UUID viewer, PageQuery page);

    /** The member's reviews, newest first. */
    PageResult<ReviewRow> reviewsBy(UUID userId, PageQuery page);

    /** The member's cellar entries on active wines, newest first, without private notes or prices. */
    PageResult<CellarRow> cellar(UUID userId, PageQuery page);

    /** The taste rows of each member; members without any are missing. */
    Map<UUID, List<TasteScore>> tastes(Collection<UUID> userIds);

    /**
     * The member's most recent rated wines with at least {@code minRating}: their non-rejected reviews and the cellar
     * ratings of wines they did not review, the same ratings the taste table reads.
     */
    List<LikedWineRow> likedWines(UUID userId, BigDecimal minRating, int limit);

    /**
     * Every rated wine of the member, with the same sources as the taste table: their non-rejected reviews and the
     * cellar ratings of wines they did not review. Each row carries the wine's type, its non-blank grapes as written
     * and its region; aggregated into the wheel, never shown one by one.
     */
    List<RatedWine> ratedWines(UUID userId);

    /** The grape catalog: names in English and Spanish and the colour category (RED, WHITE or OTHER) when known. */
    List<CatalogGrape> grapeCatalog();

    record MemberFacts(CellarVisibility cellarVisibility, boolean viewerFollows, boolean followsViewer,
            long followers, long following, long reviews, long cellarWines) { }

    record MemberRow(UUID id, String username, String firstName, String lastName, String avatarUrl,
            boolean viewerFollows) { }

    /**
     * @param dot        dot product of the member's and the viewer's taste vectors
     * @param norm       length of the member's taste vector
     * @param viewerNorm length of the viewer's taste vector
     */
    record SuggestionRow(UUID id, String username, String firstName, String lastName, String avatarUrl,
            double dot, double norm, double viewerNorm, long reviews) { }

    record ReviewRow(UUID reviewId, BigDecimal rating, String title, String comment, Integer vintage,
            Instant createdAt, UUID reviewerId, String reviewerUsername, String reviewerFirstName,
            String reviewerLastName, String reviewerAvatarUrl, WineRow wine) { }

    record CellarRow(UUID id, WineRow wine, Integer vintage, BigDecimal rating, Instant addedAt) { }

    record WineRow(UUID id, String name, String imageUrl, String type, String wineryName) { }

    /**
     * @param catalogScores the wine's own structure scores
     * @param profileScores the structure scores of one of the wine's AI profiles
     * @param profiled      whether the wine has an AI profile
     * @param descriptors   the AI profile's primary and secondary aromas and flavors
     */
    record LikedWineRow(BigDecimal rating, Map<TasteTrait, Double> catalogScores, Map<TasteTrait, Double> profileScores,
            boolean profiled, List<String> descriptors) { }
}
