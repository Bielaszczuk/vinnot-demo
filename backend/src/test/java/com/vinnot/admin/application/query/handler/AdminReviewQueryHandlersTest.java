package com.vinnot.admin.application.query.handler;

import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.admin.application.port.out.ReviewQueryPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.application.port.out.WineQueryPort;
import com.vinnot.admin.application.query.model.GetAdminReviewByIdQuery;
import com.vinnot.admin.application.query.model.SearchAdminReviewsQuery;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminReviewQueryHandlersTest {
    private static final String AVATAR = "https://api.vinnot.test/api/uploads/avatars/taster.webp";
    private final UserPointsPort userPoints = mock(UserPointsPort.class);
    private final PublicAvatarUrlResolver avatars = new PublicAvatarUrlResolver("https://api.vinnot.test/api");

    private ReviewQueryPort reviews;
    private UserQueryPort users;
    private WineQueryPort wines;
    private ReviewQueryPort.ReviewData review;
    private UserQueryPort.UserAdminData user;
    private WineQueryPort.WineData wine;

    @BeforeEach
    void setUp() {
        reviews = mock(ReviewQueryPort.class);
        users = mock(UserQueryPort.class);
        wines = mock(WineQueryPort.class);
        UUID userId = UUID.randomUUID();
        UUID wineId = UUID.randomUUID();
        Instant now = Instant.now();
        review = new ReviewQueryPort.ReviewData(UUID.randomUUID(), wineId, userId,
                new BigDecimal("4.5"), "Excellent", "Balanced", true, 2, 3, now, now);
        user = new UserQueryPort.UserAdminData(userId, "taster", "taster@vinnot.com",
                "Wine", "Taster", "USER", true, false, null, true, "/api/uploads/avatars/taster.webp", now, now, now);
        wine = new WineQueryPort.WineData(wineId, "Reserva", 2021);
    }

    @Test
    void searchesAndEnrichesReviewsInBatches() {
        PageResult<ReviewQueryPort.ReviewData> page = PageResult.of(List.of(review), 0, 20, 1);
        when(reviews.searchByKeyword(any(), any())).thenReturn(page);
        when(users.findAllByIds(any())).thenReturn(List.of(user));
        when(wines.findAllByIds(any())).thenReturn(List.of(wine));
        when(userPoints.standings(List.of(user.id()))).thenReturn(Map.of(user.id(), new UserPointsPort.Standing(300, "LAGAR")));

        var result = searchHandler().execute(new SearchAdminReviewsQuery("balance", 0, 20));

        assertThat(result.content()).singleElement().satisfies(item -> {
            assertThat(item.reviewer().displayName()).isEqualTo("Wine Taster");
            assertThat(item.reviewer().badgeTier()).isEqualTo("LAGAR");
            assertThat(item.reviewer().avatarUrl()).isEqualTo(AVATAR);
            assertThat(item.reviewer().username()).isEqualTo("taster");
            assertThat(item.rating()).isEqualByComparingTo("4.5");
            assertThat(item.wine().name()).isEqualTo("Reserva");
        });
        verify(reviews).searchByKeyword(any(), any(PageQuery.class));
    }

    @Test
    void listsReviewsAndAllowsMissingEnrichment() {
        when(reviews.findAll(any())).thenReturn(PageResult.of(List.of(review), 0, 10, 1));
        when(users.findAllByIds(any())).thenReturn(List.of());
        when(wines.findAllByIds(any())).thenReturn(List.of());

        var result = searchHandler().execute(new SearchAdminReviewsQuery(" ", 0, 10));

        assertThat(result.content().getFirst().reviewer()).isNull();
        assertThat(result.content().getFirst().wine()).isNull();
        verify(reviews).findAll(any(PageQuery.class));
    }

    @Test
    void getsDetailedReviewWithAndWithoutRelatedProjections() {
        when(reviews.findById(review.id())).thenReturn(Optional.of(review));
        when(users.findById(review.userId())).thenReturn(Optional.of(user));
        when(wines.findById(review.wineId())).thenReturn(Optional.of(wine));

        when(userPoints.standings(List.of(user.id()))).thenReturn(Map.of(user.id(), new UserPointsPort.Standing(300, "LAGAR")));
        var complete = detailHandler().execute(new GetAdminReviewByIdQuery(review.id()));
        assertThat(complete.reviewer().username()).isEqualTo("taster");
        assertThat(complete.reviewer().badgeTier()).isEqualTo("LAGAR");
        assertThat(complete.reviewer().avatarUrl()).isEqualTo(AVATAR);
        assertThat(complete.reviewer().displayName()).isEqualTo("Wine Taster");
        assertThat(complete.wine().vintage()).isEqualTo(2021);

        when(users.findById(review.userId())).thenReturn(Optional.empty());
        when(wines.findById(review.wineId())).thenReturn(Optional.empty());
        var partial = detailHandler().execute(new GetAdminReviewByIdQuery(review.id()));
        assertThat(partial.reviewer()).isNull();
        assertThat(partial.wine()).isNull();
    }

    @Test
    void reportsMissingDetailedReview() {
        UUID id = UUID.randomUUID();
        when(reviews.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> detailHandler().execute(new GetAdminReviewByIdQuery(id)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private SearchAdminReviewsQueryHandler searchHandler() {
        return new SearchAdminReviewsQueryHandler(reviews, users, wines, userPoints, avatars);
    }

    private GetAdminReviewByIdQueryHandler detailHandler() {
        return new GetAdminReviewByIdQueryHandler(reviews, users, wines, userPoints, avatars);
    }
}
