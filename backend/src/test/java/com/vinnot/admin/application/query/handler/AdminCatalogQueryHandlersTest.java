package com.vinnot.admin.application.query.handler;

import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.admin.application.port.out.EventQueryPort;
import com.vinnot.admin.application.port.out.ReviewQueryPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.application.port.out.WineQueryPort;
import com.vinnot.admin.application.port.out.WineRouteQueryPort;
import com.vinnot.admin.application.port.out.WineryQueryPort;
import com.vinnot.admin.application.query.model.GetAdminStatsQuery;
import com.vinnot.admin.application.query.model.GetAdminUserByIdQuery;
import com.vinnot.admin.application.query.model.SearchAdminEventsQuery;
import com.vinnot.admin.application.query.model.SearchAdminUsersQuery;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.Test;

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
import static org.mockito.ArgumentMatchers.eq;

class AdminCatalogQueryHandlersTest {
    private final UserPointsPort userPoints = mock(UserPointsPort.class);

    @Test
    void aggregatesDashboardCountersAcrossOutputPorts() {
        UserQueryPort users = mock(UserQueryPort.class);
        WineQueryPort wines = mock(WineQueryPort.class);
        WineryQueryPort wineries = mock(WineryQueryPort.class);
        EventQueryPort events = mock(EventQueryPort.class);
        ReviewQueryPort reviews = mock(ReviewQueryPort.class);
        WineRouteQueryPort routes = mock(WineRouteQueryPort.class);
        when(users.count()).thenReturn(11L);
        when(users.countActiveTrue()).thenReturn(9L);
        when(wines.count()).thenReturn(22L);
        when(wineries.count()).thenReturn(4L);
        when(events.count()).thenReturn(7L);
        when(events.countPublished()).thenReturn(5L);
        when(reviews.count()).thenReturn(13L);
        when(routes.count()).thenReturn(3L);
        when(routes.countPublished()).thenReturn(2L);

        var result = new GetAdminStatsQueryHandler(
                users, wines, wineries, events, reviews, routes)
                .execute(new GetAdminStatsQuery());

        assertThat(result.totalUsers()).isEqualTo(11);
        assertThat(result.totalWines()).isEqualTo(22);
        assertThat(result.publishedEvents()).isEqualTo(5);
        assertThat(result.publishedRoutes()).isEqualTo(2);
    }

    @Test
    void getsAnAdministrativeUserProjectionOrReportsItsAbsence() {
        UserQueryPort users = mock(UserQueryPort.class);
        UUID userId = UUID.randomUUID();
        when(users.findById(userId)).thenReturn(Optional.of(userData(userId)));
        GetAdminUserByIdQueryHandler handler =
                new GetAdminUserByIdQueryHandler(users, userPoints);

        assertThat(handler.execute(new GetAdminUserByIdQuery(userId)).id())
                .isEqualTo(userId);
        assertThat(handler.execute(new GetAdminUserByIdQuery(userId)).points()).as("no points read yet").isZero();
        when(userPoints.standings(List.of(userId))).thenReturn(Map.of(userId, new UserPointsPort.Standing(85, "RACIMO")));
        var withPoints = handler.execute(new GetAdminUserByIdQuery(userId));
        assertThat(withPoints.points()).isEqualTo(85);
        assertThat(withPoints.badgeTier()).isEqualTo("RACIMO");

        UUID missing = UUID.randomUUID();
        when(users.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new GetAdminUserByIdQuery(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void delegatesAdministrativeEventSearchWithDeterministicPaging() {
        EventQueryPort events = mock(EventQueryPort.class);
        when(events.searchAll(any(), any(), any(), any()))
                .thenReturn(PageResult.empty());

        var result = new SearchAdminEventsQueryHandler(events).execute(
                new SearchAdminEventsQuery("tasting", "TASTING", "Mendoza", 1, 20));

        assertThat(result.content()).isEmpty();
        verify(events).searchAll(
                eq("tasting"),
                eq("TASTING"),
                eq("Mendoza"), any());
    }

    @Test
    void switchesAdministrativeUserSearchBetweenKeywordAndFullListing() {
        UserQueryPort users = mock(UserQueryPort.class);
        UserQueryPort.UserAdminData user = userData(UUID.randomUUID());
        when(users.searchByKeyword(any(), any()))
                .thenReturn(PageResult.of(List.of(user), 0, 20, 1));
        when(users.findAll(any()))
                .thenReturn(PageResult.of(List.of(user), 0, 20, 1));
        SearchAdminUsersQueryHandler handler = new SearchAdminUsersQueryHandler(users, userPoints);

        assertThat(handler.execute(new SearchAdminUsersQuery("cris", 0, 20)).content())
                .hasSize(1);
        assertThat(handler.execute(new SearchAdminUsersQuery(" ", 0, 20)).content())
                .hasSize(1);
        verify(users).searchByKeyword(
                eq("cris"), any());
        verify(users).findAll(any());

        when(userPoints.standings(List.of(user.id()))).thenReturn(Map.of(user.id(), new UserPointsPort.Standing(12, null)));
        var listed = handler.execute(new SearchAdminUsersQuery(null, 0, 20)).content().getFirst();
        assertThat(listed.points()).isEqualTo(12);
        assertThat(listed.badgeTier()).as("locked or inactive").isNull();
        when(users.findAll(any())).thenReturn(PageResult.of(List.of(), 0, 20, 0));
        assertThat(handler.execute(new SearchAdminUsersQuery(null, 0, 20)).content()).isEmpty();
    }

    private UserQueryPort.UserAdminData userData(UUID userId) {
        Instant now = Instant.now();
        return new UserQueryPort.UserAdminData(
                userId, "user", "user@vinnot.com", "Wine", "Lover",
                "USER", true, false, null, true, null, now, now, now);
    }
}
