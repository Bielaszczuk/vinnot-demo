package com.vinnot.community.application.query.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.community.application.port.in.GetSocialUseCase;
import com.vinnot.community.application.port.out.CommunityProfileAccessPort;
import com.vinnot.community.application.port.out.MemberBadgePort;
import com.vinnot.community.application.port.out.SensoryFamilyPort;
import com.vinnot.community.application.port.out.SocialQueryPort;
import com.vinnot.community.application.port.out.SocialQueryPort.LikedWineRow;
import com.vinnot.community.application.port.out.SocialQueryPort.MemberFacts;
import com.vinnot.community.application.port.out.SocialQueryPort.MemberRow;
import com.vinnot.community.application.port.out.SocialQueryPort.ReviewRow;
import com.vinnot.community.application.port.out.SocialQueryPort.SuggestionRow;
import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort.StoredTasteQuiz;
import com.vinnot.community.application.query.response.FollowUserResponse;
import com.vinnot.community.application.query.response.PublicCellarWineResponse;
import com.vinnot.community.application.query.response.SocialProfileSummary;
import com.vinnot.community.application.query.response.SocialProfileSummary.TasteSlice;
import com.vinnot.community.application.query.response.SocialProfileSummary.TasteTraitsView;
import com.vinnot.community.application.query.response.SuggestedUserResponse;
import com.vinnot.community.application.query.response.UserReviewResponse;
import com.vinnot.community.domain.exception.CellarNotVisibleException;
import com.vinnot.community.domain.model.LikedWine;
import com.vinnot.community.domain.model.PublicName;
import com.vinnot.community.domain.model.TasteProfile;
import com.vinnot.community.domain.model.TasteQuiz;
import com.vinnot.community.domain.model.TasteScore;
import com.vinnot.community.domain.model.TasteTraits;
import com.vinnot.community.domain.model.TasteWheel;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.Set;
import java.util.UUID;

/** Social reads (#541); each list reads the seals of a whole page in one call. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetSocialQueryHandler implements GetSocialUseCase {
    static final int MAX_PAGE_SIZE = 50;
    static final int MAX_SUGGESTIONS = 20;

    private final SocialQueryPort social;
    private final CommunityProfileAccessPort access;
    private final MemberBadgePort badges;
    private final SensoryFamilyPort sensoryFamilies;
    private final TasteQuizRepositoryPort quizzes;
    private final TasteAdjustmentRepositoryPort adjustments;
    private final AvatarUrlResolver avatars;

    @Override
    public PageResult<FollowUserResponse> followers(UUID viewer, UUID userId, int page, int size) {
        PageQuery query = PageQuery.bounded(page, size, MAX_PAGE_SIZE);
        requireVisibleMember(viewer, userId);
        return members(social.followers(userId, viewer, query));
    }

    @Override
    public PageResult<FollowUserResponse> following(UUID viewer, UUID userId, int page, int size) {
        PageQuery query = PageQuery.bounded(page, size, MAX_PAGE_SIZE);
        requireVisibleMember(viewer, userId);
        return members(social.following(userId, viewer, query));
    }

    @Override
    public List<SuggestedUserResponse> suggestions(UUID viewer, int size) {
        PageQuery.bounded(0, size, MAX_SUGGESTIONS);
        TasteProfile own = TasteProfile.of(social.tastes(List.of(viewer)).getOrDefault(viewer, List.of()));
        boolean rankByAffinity = own.isShareable();
        List<SuggestionRow> rows = social.suggestions(viewer, rankByAffinity, TasteProfile.MIN_RATED_WINES, size);
        Map<UUID, String> tiers = badges.badgeTiers(rows.stream().map(SuggestionRow::id).toList());
        return rows.stream().map(row -> new SuggestedUserResponse(row.id(), row.username(),
                PublicName.of(row.username(), row.firstName(), row.lastName()), avatars.resolve(row.avatarUrl()), tiers.get(row.id()),
                rankByAffinity ? TasteProfile.percent(row.dot(), row.viewerNorm(), row.norm()) : null,
                row.reviews())).toList();
    }

    @Override
    public PageResult<UserReviewResponse> feed(UUID viewer, int page, int size) {
        return reviewPage(social.feed(viewer, PageQuery.bounded(page, size, MAX_PAGE_SIZE)));
    }

    @Override
    public PageResult<UserReviewResponse> reviews(UUID viewer, UUID userId, int page, int size) {
        PageQuery query = PageQuery.bounded(page, size, MAX_PAGE_SIZE);
        requireVisibleMember(viewer, userId);
        return reviewPage(social.reviewsBy(userId, query));
    }

    @Override
    public PageResult<PublicCellarWineResponse> cellar(UUID viewer, UUID userId, int page, int size) {
        PageQuery query = PageQuery.bounded(page, size, MAX_PAGE_SIZE);
        MemberFacts facts = visibleFacts(viewer, userId);
        if (!facts.cellarVisibility().visibleTo(userId.equals(viewer), facts.viewerFollows())) {
            throw new CellarNotVisibleException();
        }
        return social.cellar(userId, query).map(PublicCellarWineResponse::from);
    }

    @Override
    public SocialProfileSummary profile(UUID viewer, UUID userId) {
        MemberFacts facts = visibleFacts(viewer, userId);
        boolean own = userId.equals(viewer);
        boolean cellarVisible = facts.cellarVisibility().visibleTo(own, facts.viewerFollows());
        List<UUID> members = Objects.isNull(viewer) || own ? List.of(userId) : List.of(userId, viewer);
        Map<UUID, List<TasteScore>> tastes = social.tastes(members);
        TasteProfile taste = TasteProfile.of(tastes.getOrDefault(userId, List.of()));
        Integer affinity = null;
        if (members.size() == 2) {
            OptionalInt percent = taste.affinityWith(TasteProfile.of(tastes.getOrDefault(viewer, List.of())));
            affinity = percent.isPresent() ? percent.getAsInt() : null;
        }
        List<TasteSlice> wheel = taste.isShareable() ? wheel(userId) : null;
        TasteTraits liked = taste.isShareable() ? likedTraits(userId) : null;
        TasteTraits seed = quizzes.find(userId).flatMap(StoredTasteQuiz::completed).map(TasteQuiz::seed).orElse(null);
        TasteTraitsView traits = TasteTraits.blend(liked, seed, adjustments.find(userId)).map(TasteTraitsView::from)
                .orElse(null);
        return new SocialProfileSummary(badges.badgeTiers(List.of(userId)).get(userId), facts.followers(),
                facts.following(), facts.reviews(), cellarVisible ? facts.cellarWines() : null, cellarVisible,
                facts.viewerFollows(), facts.followsViewer(), affinity, wheel, traits);
    }

    /**
     * The wheel's slices from every wine the member rated, aggregated per grape, type and region; the gate stays on
     * the taste table, so it matches the affinity's.
     */
    private List<TasteSlice> wheel(UUID userId) {
        return TasteWheel.of(social.ratedWines(userId), social.grapeCatalog()).stream().map(TasteSlice::from).toList();
    }

    /** Structure and aroma families of the member's liked wines; only AI-profiled wines have their aromas read. */
    private TasteTraits likedTraits(UUID userId) {
        List<LikedWineRow> rows = social.likedWines(userId, TasteTraits.MIN_LIKED_RATING, TasteTraits.MAX_LIKED_WINES);
        List<LikedWine> wines = rows.stream().map(row -> new LikedWine(row.rating(), row.catalogScores(),
                row.profileScores(), row.profiled(),
                row.profiled() ? sensoryFamilies.familiesOf(row.descriptors()) : Set.of())).toList();
        return TasteTraits.of(wines);
    }

    private MemberFacts visibleFacts(UUID viewer, UUID userId) {
        requireNotBlocked(viewer, userId);
        return social.memberFacts(userId, viewer).orElseThrow(() -> new EntityNotFoundException("User", userId));
    }

    private void requireVisibleMember(UUID viewer, UUID userId) {
        requireNotBlocked(viewer, userId);
        if (!social.isActiveMember(userId)) {
            throw new EntityNotFoundException("User", userId);
        }
    }

    private void requireNotBlocked(UUID viewer, UUID userId) {
        if (Objects.nonNull(viewer) && !viewer.equals(userId) && access.blockedBetween(viewer, userId)) {
            throw new EntityNotFoundException("User", userId);
        }
    }

    private PageResult<FollowUserResponse> members(PageResult<MemberRow> rows) {
        Map<UUID, String> tiers = badges.badgeTiers(rows.content().stream().map(MemberRow::id).toList());
        return rows.map(row -> FollowUserResponse.from(row, avatars.resolve(row.avatarUrl()), tiers.get(row.id())));
    }

    private PageResult<UserReviewResponse> reviewPage(PageResult<ReviewRow> rows) {
        Map<UUID, String> tiers = badges.badgeTiers(rows.content().stream().map(ReviewRow::reviewerId).distinct().toList());
        return rows.map(row -> UserReviewResponse.from(row, avatars.resolve(row.reviewerAvatarUrl()),
                tiers.get(row.reviewerId())));
    }
}
