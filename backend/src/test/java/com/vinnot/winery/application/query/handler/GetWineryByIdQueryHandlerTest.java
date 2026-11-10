package com.vinnot.winery.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.application.query.model.GetWineryByIdQuery;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GetWineryByIdQueryHandlerTest {

    private final WineryRepositoryPort repository = mock(WineryRepositoryPort.class);
    private final GetWineryByIdQueryHandler handler = new GetWineryByIdQueryHandler(repository);

    @Test
    void mapsResolvedWineryAndRejectsUnknownId() {
        Winery winery = Winery.create("Catena", UUID.randomUUID());
        when(repository.findById(winery.getId())).thenReturn(Optional.of(winery));
        assertThat(handler.execute(new GetWineryByIdQuery(winery.getId())).name())
                .isEqualTo("Catena");

        when(repository.countActiveWinesByWineryIds(List.of(winery.getId())))
                .thenReturn(Map.of(winery.getId(), 12));
        assertThat(handler.execute(new GetWineryByIdQuery(winery.getId())).winesCount()).isEqualTo(12);

        UUID missing = UUID.randomUUID();
        when(repository.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new GetWineryByIdQuery(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
