package com.vinnot.activity.application.query.handler;

import com.vinnot.activity.application.port.out.AppOpenRepositoryPort;
import com.vinnot.activity.application.port.out.ContentViewRepositoryPort;
import com.vinnot.activity.domain.model.ActivityRhythm;
import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.OpenHourHistogram;
import com.vinnot.activity.domain.model.ViewedContent;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ReadActivitySignalsQueryHandlerTest {
    private static final Instant NOW = Instant.parse("2026-10-20T03:00:00Z");
    private final AppOpenRepositoryPort opens = mock(AppOpenRepositoryPort.class);
    private final ContentViewRepositoryPort views = mock(ContentViewRepositoryPort.class);
    private final ReadActivitySignalsQueryHandler handler = new ReadActivitySignalsQueryHandler(
            opens, views, Duration.ofDays(30), Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void combinesLastActiveWithTheUsualHourOfTheLastThirtyDays() {
        UUID regular = UUID.randomUUID();
        UUID quiet = UUID.randomUUID();
        UUID never = UUID.randomUUID();
        List<UUID> users = List.of(regular, quiet, never);
        Instant active = NOW.minus(Duration.ofHours(5));
        Instant longAgo = NOW.minus(Duration.ofDays(60));
        when(opens.lastActive(users)).thenReturn(Map.of(regular, active, quiet, longAgo));
        when(opens.openHoursSince(users, NOW.minus(Duration.ofDays(30))))
                .thenReturn(Map.of(regular, new OpenHourHistogram(Map.of(20, 3, 9, 1))));

        Map<UUID, ActivityRhythm> rhythms = handler.rhythms(users);

        assertThat(rhythms).containsOnlyKeys(regular, quiet);
        assertThat(rhythms.get(regular).lastActiveAt()).isEqualTo(active);
        assertThat(rhythms.get(regular).usualOpenHour()).isEqualTo(OptionalInt.of(20));
        assertThat(rhythms.get(quiet).lastActiveAt()).isEqualTo(longAgo);
        assertThat(rhythms.get(quiet).usualOpenHour()).as("no opens in the window").isEmpty();
    }

    @Test
    void passesViewQueriesThroughAndAnEmptyPageNeedsNoQuery() {
        UUID user = UUID.randomUUID();
        Instant since = NOW.minus(Duration.ofDays(14));
        var viewed = new ViewedContent(ContentKind.ROUTE, UUID.randomUUID(), 3, NOW);
        when(views.viewsSince(List.of(user), ContentKind.ROUTE, since)).thenReturn(Map.of(user, List.of(viewed)));
        when(views.mostViewed(ContentKind.WINE, since, 5)).thenReturn(List.of(viewed));

        assertThat(handler.viewsSince(List.of(user), ContentKind.ROUTE, since)).containsEntry(user, List.of(viewed));
        assertThat(handler.mostViewed(ContentKind.WINE, since, 5)).containsExactly(viewed);

        AppOpenRepositoryPort noOpens = mock(AppOpenRepositoryPort.class);
        ContentViewRepositoryPort noViews = mock(ContentViewRepositoryPort.class);
        var empty = new ReadActivitySignalsQueryHandler(noOpens, noViews, Duration.ofDays(30), Clock.systemUTC());
        assertThat(empty.rhythms(List.of())).isEmpty();
        assertThat(empty.viewsSince(List.of(), ContentKind.WINE, since)).isEmpty();
        verifyNoInteractions(noOpens, noViews);
    }

    @Test
    void theWindowAndLimitMustBePositive() {
        assertThatThrownBy(() -> new ReadActivitySignalsQueryHandler(opens, views, Duration.ZERO, Clock.systemUTC()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> handler.mostViewed(ContentKind.WINE, NOW, 0))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(views);
    }
}
