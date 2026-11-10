package com.vinnot.user.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.user.application.port.out.CellarQueryPort;
import com.vinnot.user.application.port.out.EventQueryPort;
import com.vinnot.user.application.port.out.ReviewQueryPort;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.query.model.GetUserByIdQuery;
import com.vinnot.user.application.query.model.GetUserStatsQuery;
import com.vinnot.user.application.query.model.SearchUsersQuery;
import com.vinnot.user.application.query.model.ValidatePasswordResetTokenQuery;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.domain.valueobject.UserActionTokenStatus;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

class UserCatalogQueryHandlersTest {

    @Test
    void returnsAUserWithLinkedIdentityProvidersOrReportsItsAbsence() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        SocialIdentityRepositoryPort identities =
                mock(SocialIdentityRepositoryPort.class);
        User user = user();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(identities.findByUserId(user.getId())).thenReturn(List.of(
                SocialIdentity.create(
                        user.getId(), SocialProvider.GOOGLE, "subject",
                        user.getEmail().getValue())));
        GetUserByIdQueryHandler handler =
                new GetUserByIdQueryHandler(users, identities);

        var response = handler.execute(new GetUserByIdQuery(user.getId()));

        assertThat(response.id()).isEqualTo(user.getId());
        assertThat(response.socialProviders()).containsExactly("GOOGLE");
        assertThat(response.hasSocialIdentity()).isTrue();
        assertThat(response.hasPassword()).as("linking Google keeps the password the owner chose").isTrue();

        User social = User.createSocial("vinnoter-abc12345", Email.of("social@vinnot.com"),
                Password.fromHash("unusable"), "So", "Cial");
        when(users.findById(social.getId())).thenReturn(Optional.of(social));
        when(identities.findByUserId(social.getId())).thenReturn(List.of());
        assertThat(handler.execute(new GetUserByIdQuery(social.getId())).hasPassword()).isFalse();

        UUID missing = UUID.randomUUID();
        when(users.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new GetUserByIdQuery(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void aggregatesUserActivityStatistics() {
        ReviewQueryPort reviews = mock(ReviewQueryPort.class);
        CellarQueryPort cellar = mock(CellarQueryPort.class);
        EventQueryPort events = mock(EventQueryPort.class);
        UUID userId = UUID.randomUUID();
        when(reviews.getUserReviewStats(userId))
                .thenReturn(new ReviewQueryPort.UserReviewStats(3, 4.5));
        when(cellar.countByUserId(userId)).thenReturn(8L);
        when(events.countRegistrationsByUserId(userId)).thenReturn(2L);

        var response = new GetUserStatsQueryHandler(reviews, cellar, events)
                .execute(new GetUserStatsQuery(userId));

        assertThat(response.reviewsCount()).isEqualTo(3);
        assertThat(response.totalCellarWines()).isEqualTo(8);
        assertThat(response.eventsAttended()).isEqualTo(2);
        assertThat(response.averageRating()).isEqualTo(4.5);
    }

    @Test
    void switchesUserSearchBetweenKeywordAndFullListingAndCapsPageSize() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User user = user();
        when(users.searchByKeyword(any(), any()))
                .thenReturn(PageResult.of(List.of(user), 0, 100, 1));
        when(users.findAll(any()))
                .thenReturn(PageResult.of(List.of(user), 0, 20, 1));
        SearchUsersQueryHandler handler = new SearchUsersQueryHandler(users);

        assertThat(handler.execute(new SearchUsersQuery("wine", 0, 500)).content())
                .hasSize(1);
        assertThat(handler.execute(new SearchUsersQuery(" ", 0, 20)).content())
                .hasSize(1);
        verify(users).searchByKeyword(
                eq("wine"), any());
        verify(users).findAll(any());
    }

    @Test
    void validatesPasswordResetTokensThroughTheTokenService() {
        AccountActionTokenService tokens = mock(AccountActionTokenService.class);
        when(tokens.getStatus("token", UserActionTokenType.PASSWORD_RESET))
                .thenReturn(UserActionTokenStatus.VALID);

        var status = new ValidatePasswordResetTokenQueryHandler(tokens)
                .execute(new ValidatePasswordResetTokenQuery("token"));

        assertThat(status).isEqualTo(UserActionTokenStatus.VALID);
    }

    private User user() {
        return User.create(
                "wine-user",
                Email.of("user@example.com"),
                Password.fromHash("hash"),
                "Wine",
                "User");
    }
}
