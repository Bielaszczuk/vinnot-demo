package com.vinnot.cellar.application.query.handler;

import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.application.port.out.WineQueryPort;
import com.vinnot.cellar.application.port.out.ReviewQueryPort;
import com.vinnot.cellar.application.query.model.GetUserCellarQuery;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class GetUserCellarQueryHandlerTest {

    private final CellarWineRepositoryPort repository = mock(CellarWineRepositoryPort.class);
    private final WineQueryPort wineQueryPort = mock(WineQueryPort.class);
    private final ReviewQueryPort reviewQueryPort = mock(ReviewQueryPort.class);
    private final GetUserCellarQueryHandler handler =
            new GetUserCellarQueryHandler(repository, wineQueryPort, reviewQueryPort);

    @Test
    void enrichesCellarEntriesAndPreservesPagination() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = CellarWine.create(userId, UUID.randomUUID());
        entry.updateVintage(2018);
        when(repository.findByUserId(userId, PageQuery.of(1, 10, "id", PageQuery.SortDirection.ASC)))
                .thenReturn(PageResult.of(List.of(entry), 1, 10, 11));
        when(wineQueryPort.findAllByIds(List.of(entry.getWineId())))
                .thenReturn(List.of(new WineQueryPort.WineDetailData(
                        entry.getWineId(), "Reserva", 2021, "RED", "Dry",
                        List.of("Malbec"), "Catena", "Mendoza", "Argentina",
                        BigDecimal.TEN, BigDecimal.valueOf(20), "image.jpg",
                        BigDecimal.valueOf(4.5))));

        var result = handler.execute(new GetUserCellarQuery(userId, 1, 10));

        assertThat(result.totalPages()).isEqualTo(2);
        assertThat(result.content()).singleElement().satisfies(response -> {
            assertThat(response.wine().name()).isEqualTo("Reserva");
            assertThat(response.wine().wineryName()).isEqualTo("Catena");
            assertThat(response.vintage()).isEqualTo(2018);
            assertThat(response.wine().vintage()).isEqualTo(2021);
        });
    }

    @Test
    void legacyDefaultReturnsEmptyCellarWithOneBoundedRead() {
        UUID userId = UUID.randomUUID();
        when(repository.findByUserId(eq(userId), any()))
                .thenReturn(PageResult.of(List.of(), 0, 200, 0));
        var result = handler.execute(new GetUserCellarQuery(userId, 0, 1000));
        assertThat(result.content()).isEmpty();
        assertThat(result.size()).isEqualTo(1000);
        verify(repository).findByUserId(userId, PageQuery.of(0, 200, "id", PageQuery.SortDirection.ASC));
        verifyNoMoreInteractions(repository);
    }

    @Test
    void legacyWindowUsesAtMostFiveStablePagesWithoutDroppingEntries() {
        UUID userId = UUID.randomUUID();
        List<CellarWine> entries = IntStream.range(0, 1000)
                .mapToObj(index -> CellarWine.create(userId, UUID.randomUUID())).toList();
        for (int index = 0; index < 5; index++) {
            when(repository.findByUserId(userId, PageQuery.of(5 + index, 200, "id", PageQuery.SortDirection.ASC)))
                    .thenReturn(PageResult.of(entries.subList(index * 200, (index + 1) * 200), 5 + index, 200, 2100));
        }
        var result = handler.execute(new GetUserCellarQuery(userId, 1, 1000));
        assertThat(result.content()).extracting(response -> response.id())
                .containsExactlyElementsOf(entries.stream().map(CellarWine::getId).toList());
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.totalElements()).isEqualTo(2100);
        assertThat(result.totalPages()).isEqualTo(3);
        verify(repository, times(5)).findByUserId(eq(userId), any());
    }

    @Test
    void partialFinalWindowStopsAtItsLastPage() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = CellarWine.create(userId, UUID.randomUUID());
        when(repository.findByUserId(userId, PageQuery.of(10, 200, "id", PageQuery.SortDirection.ASC)))
                .thenReturn(PageResult.of(List.of(entry), 10, 200, 2001));
        var result = handler.execute(new GetUserCellarQuery(userId, 2, 1000));
        assertThat(result.content()).singleElement().satisfies(response -> assertThat(response.wine()).isNull());
        verify(repository).findByUserId(userId, PageQuery.of(10, 200, "id", PageQuery.SortDirection.ASC));
        verifyNoMoreInteractions(repository);
    }

    @Test
    void invalidSizesAndOffsetsFailBeforeAnyRepositoryAccess() {
        for (var query : List.of(new GetUserCellarQuery(UUID.randomUUID(), -1, 1000),
                new GetUserCellarQuery(UUID.randomUUID(), Integer.MAX_VALUE, 1000),
                new GetUserCellarQuery(UUID.randomUUID(), 0, 1001),
                new GetUserCellarQuery(UUID.randomUUID(), 0, 201))) {
            assertThatThrownBy(() -> handler.execute(query)).isInstanceOf(BusinessRuleViolationException.class);
        }
        verifyNoInteractions(repository, wineQueryPort, reviewQueryPort);
    }
    @Test
    void enrichesOnlyTheOwnersReviewsWithOneBatchForAllCellarWines() {
        UUID owner = UUID.randomUUID();
        UUID reviewId = UUID.randomUUID();
        CellarWine published = CellarWine.create(owner, UUID.randomUUID());
        CellarWine personal = CellarWine.create(owner, UUID.randomUUID());
        List<UUID> wineIds = List.of(published.getWineId(), personal.getWineId());
        when(repository.findByUserId(eq(owner), any()))
                .thenReturn(PageResult.of(List.of(published, personal), 0, 10, 2));
        when(reviewQueryPort.findReviewIds(owner, wineIds))
                .thenReturn(Map.of(published.getWineId(), reviewId));

        var result = handler.execute(new GetUserCellarQuery(owner, 0, 10));

        assertThat(result.content().get(0).reviewId()).isEqualTo(reviewId);
        assertThat(result.content().get(1).reviewId()).isNull();
        verify(reviewQueryPort).findReviewIds(owner, wineIds);
        verifyNoMoreInteractions(reviewQueryPort);
    }

}
