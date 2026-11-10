package com.vinnot.winery.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.winery.application.command.model.DeleteWineryCommand;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeleteWineryCommandHandlerTest {

    private final WineryRepositoryPort repository = mock(WineryRepositoryPort.class);
    private final DeleteWineryCommandHandler handler = new DeleteWineryCommandHandler(repository);

    @Test
    void deletesResolvedAggregateAndRejectsUnknownId() {
        Winery winery = Winery.create("Catena", UUID.randomUUID());
        when(repository.findById(winery.getId())).thenReturn(Optional.of(winery));
        handler.execute(new DeleteWineryCommand(winery.getId()));
        verify(repository).delete(winery);

        UUID missing = UUID.randomUUID();
        when(repository.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new DeleteWineryCommand(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
