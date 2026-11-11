package com.vinnot.community.application.query.handler;

import com.vinnot.community.application.port.out.CommunityProfileAccessPort;
import com.vinnot.community.application.port.out.MemberBadgePort;
import com.vinnot.community.application.port.out.SensoryFamilyPort;
import com.vinnot.community.application.port.out.SocialQueryPort;
import com.vinnot.community.application.port.out.SocialQueryPort.MemberRow;
import com.vinnot.community.application.port.out.SocialQueryPort.ReviewRow;
import com.vinnot.community.application.port.out.SocialQueryPort.SuggestionRow;
import com.vinnot.community.application.port.out.SocialQueryPort.WineRow;
import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** #541 S12: social lists, suggestions and review feeds return the avatar URL clients load. */
class GetSocialQueryHandlerAvatarTest {
    private static final String STORED = "/api/uploads/avatars/ana.webp";
    private static final String ABSOLUTE = "https://api.vinnot.test/api/uploads/avatars/ana.webp";
    private static final String GOOGLE = "https://lh3.googleusercontent.com/a/photo=s256-c";

    private final UUID viewer = UUID.randomUUID();
    private final UUID member = UUID.randomUUID();
    private final SocialQueryPort social = mock(SocialQueryPort.class);
    private final GetSocialQueryHandler handler = new GetSocialQueryHandler(social,
            mock(CommunityProfileAccessPort.class), mock(MemberBadgePort.class), mock(SensoryFamilyPort.class),
            mock(TasteQuizRepositoryPort.class), mock(TasteAdjustmentRepositoryPort.class),
            new PublicAvatarUrlResolver("https://api.vinnot.test/api"));

    @Test
    void followersAndFollowingReturnAbsoluteAvatars() {
        when(social.isActiveMember(member)).thenReturn(true);
        MemberRow uploaded = new MemberRow(member, "ana", "Ana", "Pérez", STORED, true);
        MemberRow google = new MemberRow(UUID.randomUUID(), "bea", null, null, GOOGLE, false);
        MemberRow none = new MemberRow(UUID.randomUUID(), "cami", null, null, null, false);
        when(social.followers(eq(member), eq(viewer), any())).thenReturn(PageResult.of(List.of(uploaded, google), 0, 20, 2));
        when(social.following(eq(member), eq(viewer), any())).thenReturn(PageResult.of(List.of(none), 0, 20, 1));

        var followers = handler.followers(viewer, member, 0, 20).content();
        var following = handler.following(viewer, member, 0, 20).content();

        assertThat(followers.getFirst().avatarUrl()).isEqualTo(ABSOLUTE);
        assertThat(followers.getFirst().displayName()).isEqualTo("Ana Pérez");
        assertThat(followers.getFirst().following()).isTrue();
        assertThat(followers.get(1).avatarUrl()).isEqualTo(GOOGLE);
        assertThat(following.getFirst().avatarUrl()).isNull();
        assertThat(following.getFirst().username()).isEqualTo("cami");
    }

    @Test
    void suggestionsReturnAbsoluteAvatars() {
        when(social.tastes(List.of(viewer))).thenReturn(Map.of());
        when(social.suggestions(eq(viewer), anyBoolean(), anyInt(), eq(10))).thenReturn(List.of(
                new SuggestionRow(member, "ana", "Ana", null, STORED, 0, 0, 0, 3)));

        var suggestion = handler.suggestions(viewer, 10).getFirst();

        assertThat(suggestion.avatarUrl()).isEqualTo(ABSOLUTE);
        assertThat(suggestion.reviewsCount()).isEqualTo(3);
        assertThat(suggestion.affinityPercent()).isNull();
    }

    @Test
    void feedAndMemberReviewsReturnTheReviewersAbsoluteAvatar() {
        when(social.isActiveMember(member)).thenReturn(true);
        ReviewRow row = new ReviewRow(UUID.randomUUID(), new BigDecimal("4.5"), "Great", "Body", 2020,
                Instant.parse("2026-10-01T12:00:00Z"), member, "ana", "Ana", null, STORED,
                new WineRow(UUID.randomUUID(), "Malbec", "/api/uploads/wine.webp", "RED", "Bodega"));
        when(social.feed(eq(viewer), any())).thenReturn(PageResult.of(List.of(row), 0, 20, 1));
        when(social.reviewsBy(eq(member), any())).thenReturn(PageResult.of(List.of(row), 0, 20, 1));

        var feed = handler.feed(viewer, 0, 20).content().getFirst();
        var reviews = handler.reviews(viewer, member, 0, 20).content().getFirst();

        assertThat(feed.reviewer().avatarUrl()).isEqualTo(ABSOLUTE);
        assertThat(reviews.reviewer().avatarUrl()).isEqualTo(ABSOLUTE);
        assertThat(feed.reviewer().displayName()).isEqualTo("Ana");
        assertThat(feed.wine().imageUrl()).as("wine images are unchanged").isEqualTo("/api/uploads/wine.webp");
        assertThat(feed.title()).isEqualTo("Great");
    }
}
