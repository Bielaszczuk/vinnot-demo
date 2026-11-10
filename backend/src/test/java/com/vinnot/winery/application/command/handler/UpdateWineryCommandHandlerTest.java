package com.vinnot.winery.application.command.handler;

import java.util.Objects;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.winery.application.command.model.UpdateWineryCommand;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.winery.domain.valueobject.Location;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;

class UpdateWineryCommandHandlerTest {

    private final WineryRepositoryPort repository = mock(WineryRepositoryPort.class);
    private final UpdateWineryCommandHandler handler = new UpdateWineryCommandHandler(repository);

    @Test
    void updatesAggregateIncludingBothDescriptions() {
        Winery winery = Winery.create("Old", UUID.randomUUID());
        UUID countryId = UUID.randomUUID();
        when(repository.findById(winery.getId())).thenReturn(Optional.of(winery));
        var command = new UpdateWineryCommand(
                winery.getId(), "New", "ES", "EN", countryId, UUID.randomUUID(),
                "Uco", "Address", new BigDecimal("-32.9"), new BigDecimal("-68.8"),
                null, null, null, null, null, 2000);

        handler.execute(command);

        verify(repository).save(argThat(updated ->
                updated.getName().equals("New")
                        && updated.getDescriptionEs().equals("ES")
                        && updated.getDescriptionEn().equals("EN")
                        && Objects.nonNull(updated.getLocation().getCoordinates())
                        && updated.getEstablishedYear() == 2000));
    }

    @Test
    void partialNameUpdatePreservesDescriptionsImagesAndCoordinates() {
        Winery winery = Winery.create("Old", UUID.randomUUID());
        winery.updateDescriptions("ES", "EN");
        winery.updateImages("logo.jpg", "cover.jpg");
        winery.updateLocation(Location.of("Address",
                Coordinates.of(BigDecimal.ZERO, BigDecimal.ZERO)));
        when(repository.findById(winery.getId())).thenReturn(Optional.of(winery));
        handler.execute(new UpdateWineryCommand(winery.getId(), "New", null, null, null, null, null,
                null, null, null, null, null, null, null, null, null));
        assertThat(winery.getDescriptionEn()).isEqualTo("EN");
        assertThat(winery.getDescriptionEs()).isEqualTo("ES");
        assertThat(winery.getImageUrl()).isEqualTo("cover.jpg");
        assertThat(winery.getLocation().getCoordinates().getLatitude()).isEqualTo(BigDecimal.ZERO);
        verify(repository).save(winery);
    }

    @Test
    void rejectsHalfACoordinatePair() {
        Winery winery = Winery.create("Winery", UUID.randomUUID());
        when(repository.findById(winery.getId())).thenReturn(Optional.of(winery));
        assertThatThrownBy(() -> handler.execute(new UpdateWineryCommand(winery.getId(), null, null, null, null, null, null,
                null, BigDecimal.ZERO, null, null, null, null, null, null, null)))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_COORDINATES");
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsUnknownWinery() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.execute(new UpdateWineryCommand(
                id, "Name", null, null, UUID.randomUUID(), null, null,
                null, null, null, null, null, null, null, null, null)))
                .isInstanceOf(EntityNotFoundException.class);
        verify(repository, never()).save(any());
    }
}
