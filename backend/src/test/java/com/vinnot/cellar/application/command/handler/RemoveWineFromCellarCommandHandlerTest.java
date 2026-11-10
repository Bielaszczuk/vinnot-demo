package com.vinnot.cellar.application.command.handler;

import com.vinnot.cellar.application.command.model.RemoveWineFromCellarCommand;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RemoveWineFromCellarCommandHandlerTest {

    private final CellarWineRepositoryPort repository = mock(CellarWineRepositoryPort.class);
    private final RemoveWineFromCellarCommandHandler handler =
            new RemoveWineFromCellarCommandHandler(repository);

    @Test
    void removesEntryOwnedByRequestingUser() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = CellarWine.create(userId, UUID.randomUUID());
        when(repository.findById(entry.getId())).thenReturn(Optional.of(entry));

        handler.execute(new RemoveWineFromCellarCommand(entry.getId(), userId));

        verify(repository).delete(entry);
    }

    @Test
    void rejectsRemovalOfAnotherUsersEntry() {
        CellarWine entry = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());
        when(repository.findById(entry.getId())).thenReturn(Optional.of(entry));

        assertThatThrownBy(() -> handler.execute(new RemoveWineFromCellarCommand(
                entry.getId(), UUID.randomUUID())))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(repository, never()).delete(entry);
    }
}
