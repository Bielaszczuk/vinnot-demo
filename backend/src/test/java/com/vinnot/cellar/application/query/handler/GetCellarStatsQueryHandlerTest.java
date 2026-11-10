package com.vinnot.cellar.application.query.handler;

import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.application.port.out.WineQueryPort;
import com.vinnot.cellar.application.query.model.GetCellarStatsQuery;
import com.vinnot.cellar.domain.model.CellarWine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GetCellarStatsQueryHandlerTest {

    private final CellarWineRepositoryPort repository = mock(CellarWineRepositoryPort.class);
    private final WineQueryPort wineQueryPort = mock(WineQueryPort.class);
    private final GetCellarStatsQueryHandler handler =
            new GetCellarStatsQueryHandler(repository, wineQueryPort);

    @Test
    void aggregatesRatingsTypesWineriesAndRegionsFromResolvedWineData() {
        UUID userId = UUID.randomUUID();
        CellarWine first = entry(userId, "4.5");
        CellarWine second = entry(userId, "2");
        CellarWine third = entry(userId, null);
        when(repository.findAllByUserId(userId))
                .thenReturn(List.of(first, second, third));
        when(wineQueryPort.findAllByIds(List.of(
                first.getWineId(), second.getWineId(), third.getWineId())))
                .thenReturn(List.of(
                        wine(first.getWineId(), "RED", "Catena", "Mendoza"),
                        wine(second.getWineId(), "RED", "Catena", "Mendoza"),
                        wine(third.getWineId(), null, "Norton", "Luján")));

        var stats = handler.execute(new GetCellarStatsQuery(userId));

        assertThat(stats.totalWines()).isEqualTo(3);
        assertThat(stats.ratedWines()).isEqualTo(2);
        assertThat(stats.averageRating()).isEqualTo(3.25);
        assertThat(stats.uniqueWineries()).isEqualTo(2);
        assertThat(stats.uniqueRegions()).isEqualTo(2);
        assertThat(stats.byType()).containsEntry("RED", 2).containsEntry("UNKNOWN", 1);
    }

    private CellarWine entry(UUID userId, String rating) {
        CellarWine entry = CellarWine.create(userId, UUID.randomUUID());
        entry.updateRating(Objects.isNull(rating) ? null : new BigDecimal(rating));
        return entry;
    }

    private WineQueryPort.WineDetailData wine(
            UUID id, String type, String winery, String region) {
        return new WineQueryPort.WineDetailData(
                id, "Wine", 2020, type, null, List.of(), winery, region,
                "Argentina", null, null, null, BigDecimal.ZERO);
    }
}
