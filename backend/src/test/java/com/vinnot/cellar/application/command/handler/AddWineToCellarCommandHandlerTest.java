package com.vinnot.cellar.application.command.handler;

import com.vinnot.cellar.application.port.out.CellarPointsPort;
import com.vinnot.cellar.application.command.model.AddWineToCellarCommand;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;

class AddWineToCellarCommandHandlerTest {
    private final CellarPointsPort points = mock(CellarPointsPort.class);

    private final CellarWineRepositoryPort repository = mock(CellarWineRepositoryPort.class);
    private final AddWineToCellarCommandHandler handler =
            new AddWineToCellarCommandHandler(repository, points);

    @Test
    void createsEntryWithPersonalMetadata() {
        UUID userId = UUID.randomUUID();
        UUID wineId = UUID.randomUUID();
        var command = new AddWineToCellarCommand(
                userId, wineId, new BigDecimal("4"), new BigDecimal("15000"), "Guardar", null);
        when(repository.save(any(CellarWine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UUID id = handler.execute(command);

        assertThat(id).isNotNull();
        verify(repository).save(argThat(entry ->
                entry.getUserId().equals(userId)
                        && entry.getWineId().equals(wineId)
                        && entry.getRating().compareTo(new BigDecimal("4")) == 0
                        && entry.getNotes().equals("Guardar")));
        verify(points).wineAddedByHand(userId, wineId);
    }

    @Test
    void rejectsDuplicateWineForTheSameUser() {
        UUID userId = UUID.randomUUID();
        UUID wineId = UUID.randomUUID();
        when(repository.existsByUserIdAndWineId(userId, wineId)).thenReturn(true);

        assertThatThrownBy(() -> handler.execute(
                new AddWineToCellarCommand(userId, wineId, null, null, null, null)))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void storesTheTastedVintage() {
        UUID userId = UUID.randomUUID();
        UUID wineId = UUID.randomUUID();
        when(repository.save(any(CellarWine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        handler.execute(new AddWineToCellarCommand(userId, wineId, null, null, null, 2019));

        verify(repository).save(argThat(entry -> Integer.valueOf(2019).equals(entry.getVintage())));
    }
}
