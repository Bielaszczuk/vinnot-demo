package com.vinnot.cellar.application.command.handler;

import com.vinnot.cellar.application.command.model.RemoveWineFromCellarCommand;
import com.vinnot.cellar.application.command.model.UpdateCellarEntryCommand;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CellarEntryOwnershipTest {

    @Mock
    private CellarWineRepositoryPort repository;

    private CellarWine entry;
    private UUID ownerId;

    @BeforeEach
    void setUp() {
        ownerId = UUID.randomUUID();
        entry = CellarWine.create(ownerId, UUID.randomUUID());
        when(repository.findById(entry.getId())).thenReturn(Optional.of(entry));
    }

    @Test
    void rejectsUpdatingAnotherUsersCellarEntry() {
        UpdateCellarEntryCommandHandler handler =
                new UpdateCellarEntryCommandHandler(repository);
        UpdateCellarEntryCommand command = new UpdateCellarEntryCommand(
                entry.getId(),
                UUID.randomUUID(),
                new BigDecimal("4"),
                new BigDecimal("120.50"),
                "Private note", null, false);

        assertThatThrownBy(() -> handler.execute(command))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("CELLAR_ENTRY_OWNERSHIP");

        verify(repository, never()).save(entry);
    }

    @Test
    void rejectsRemovingAnotherUsersCellarEntry() {
        RemoveWineFromCellarCommandHandler handler =
                new RemoveWineFromCellarCommandHandler(repository);

        assertThatThrownBy(() -> handler.execute(
                new RemoveWineFromCellarCommand(entry.getId(), UUID.randomUUID())))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("CELLAR_ENTRY_OWNERSHIP");

        verify(repository, never()).delete(entry);
    }

    @Test
    void allowsOwnerToUpdateCellarEntry() {
        UpdateCellarEntryCommandHandler handler =
                new UpdateCellarEntryCommandHandler(repository);
        UpdateCellarEntryCommand command = new UpdateCellarEntryCommand(
                entry.getId(), ownerId, new BigDecimal("5"), null, "Ready to drink", null, false);

        handler.execute(command);

        verify(repository).save(entry);
    }
}
