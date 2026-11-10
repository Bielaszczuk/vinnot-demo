package com.vinnot.winery.application.command.handler;

import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.winery.application.command.model.UpdateWineryCoordinatesCommand;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.domain.valueobject.Location;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UpdateWineryCoordinatesCommandHandlerTest {

    private final WineryRepositoryPort repository = mock(WineryRepositoryPort.class);
    private final UpdateWineryCoordinatesCommandHandler handler =
            new UpdateWineryCoordinatesCommandHandler(repository);

    @Test
    void preservesExistingAddressWhenAddingMissingCoordinates() {
        Winery winery = Winery.create("Catena", UUID.randomUUID());
        winery.updateLocation(Location.ofAddress("Existing address"));
        when(repository.findById(winery.getId())).thenReturn(Optional.of(winery));

        handler.execute(new UpdateWineryCoordinatesCommand(
                winery.getId(), new BigDecimal("-32.9"),
                new BigDecimal("-68.8"), null));

        assertThat(winery.getLocation().getAddress()).isEqualTo("Existing address");
        assertThat(winery.getLocation().hasCoordinates()).isTrue();
        verify(repository).save(winery);
    }

    @Test
    void doesNotOverwriteExistingCoordinates() {
        Winery winery = Winery.create("Catena", UUID.randomUUID());
        winery.updateLocation(Location.of(
                "Address", Coordinates.of(-30.0, -60.0)));
        when(repository.findById(winery.getId())).thenReturn(Optional.of(winery));

        handler.execute(new UpdateWineryCoordinatesCommand(
                winery.getId(), BigDecimal.ZERO, BigDecimal.ZERO, "New"));

        verify(repository, never()).save(winery);
        assertThat(winery.getLocation().getCoordinates())
                .isEqualTo(Coordinates.of(-30.0, -60.0));
    }
}
