package com.vinnot.cellar.application.command.handler;

import com.vinnot.cellar.application.command.model.UpdateCellarEntryCommand;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;

class UpdateCellarEntryCommandHandlerTest {

    private final CellarWineRepositoryPort repository = mock(CellarWineRepositoryPort.class);
    private final UpdateCellarEntryCommandHandler handler =
            new UpdateCellarEntryCommandHandler(repository);

    @Test
    void updatesEntryOwnedByRequestingUser() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = CellarWine.create(userId, UUID.randomUUID());
        when(repository.findById(entry.getId())).thenReturn(Optional.of(entry));

        handler.execute(new UpdateCellarEntryCommand(
                entry.getId(), userId, new BigDecimal("5"), new BigDecimal("20000"), "Now", null, false));

        verify(repository).save(argThat(saved ->
                saved.getRating().compareTo(new BigDecimal("5")) == 0
                        && saved.getPurchasePrice().compareTo(new BigDecimal("20000")) == 0
                        && saved.getNotes().equals("Now")));
    }

    @Test
    void rejectsMissingOrForeignEntry() {
        UUID missingId = UUID.randomUUID();
        when(repository.findById(missingId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new UpdateCellarEntryCommand(
                missingId, UUID.randomUUID(), null, null, null, null, false)))
                .isInstanceOf(EntityNotFoundException.class);

        CellarWine foreign = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());
        when(repository.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        assertThatThrownBy(() -> handler.execute(new UpdateCellarEntryCommand(
                foreign.getId(), UUID.randomUUID(), null, null, null, null, false)))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(repository, never()).save(foreign);
    }

    @Test
    void updateWithoutVintageKeepsTheStoredVintage() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = storedWithVintage(userId, 2018);

        handler.execute(new UpdateCellarEntryCommand(
                entry.getId(), userId, new BigDecimal("4"), null, "Still good", null, false));

        assertThat(entry.getVintage()).isEqualTo(2018);
        assertThat(entry.getNotes()).isEqualTo("Still good");
        verify(repository).save(entry);
    }

    @Test
    void nonNullVintageReplacesTheStoredVintage() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = storedWithVintage(userId, 2018);

        handler.execute(new UpdateCellarEntryCommand(
                entry.getId(), userId, new BigDecimal("4"), null, null, 2020, false));

        assertThat(entry.getVintage()).isEqualTo(2020);
    }

    @Test
    void clearVintageRemovesItEvenWhenAVintageIsSupplied() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = storedWithVintage(userId, 2018);
        handler.execute(new UpdateCellarEntryCommand(
                entry.getId(), userId, null, null, null, null, true));
        assertThat(entry.getVintage()).isNull();

        entry.updateVintage(2018);
        handler.execute(new UpdateCellarEntryCommand(
                entry.getId(), userId, null, null, null, 2020, true));
        assertThat(entry.getVintage()).isNull();
    }

    @Test
    void rejectsAnImpossibleVintageWithoutSaving() {
        UUID userId = UUID.randomUUID();
        CellarWine entry = storedWithVintage(userId, 2018);

        assertThatThrownBy(() -> handler.execute(new UpdateCellarEntryCommand(
                entry.getId(), userId, null, null, null, 1700, false)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_VINTAGE");
        verify(repository, never()).save(any());
    }

    private CellarWine storedWithVintage(UUID userId, int vintage) {
        CellarWine entry = CellarWine.create(userId, UUID.randomUUID());
        entry.updateVintage(vintage);
        when(repository.findById(entry.getId())).thenReturn(Optional.of(entry));
        return entry;
    }
}
