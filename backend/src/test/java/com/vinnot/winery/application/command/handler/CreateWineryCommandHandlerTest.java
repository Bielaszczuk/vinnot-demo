package com.vinnot.winery.application.command.handler;

import com.vinnot.winery.application.command.model.CreateWineryCommand;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;

class CreateWineryCommandHandlerTest {

    private final WineryRepositoryPort repository = mock(WineryRepositoryPort.class);
    private final CreateWineryCommandHandler handler = new CreateWineryCommandHandler(repository);

    @Test
    void createsCompleteWineryWithoutLosingLocalizedDescription() {
        UUID countryId = UUID.randomUUID();
        UUID regionId = UUID.randomUUID();
        var command = new CreateWineryCommand(
                "Catena", "Descripción", "Description", countryId, regionId,
                "Uco", "Mendoza", new BigDecimal("-32.9"),
                new BigDecimal("-68.8"), "wine@example.com", "+54",
                "https://wine.test", "logo.jpg", "hero.jpg", 1902);
        when(repository.save(any(Winery.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UUID id = handler.execute(command);

        assertThat(id).isNotNull();
        verify(repository).save(argThat(winery ->
                winery.getDescriptionEs().equals("Descripción")
                        && winery.getDescriptionEn().equals("Description")
                        && winery.getLocation().hasCoordinates()
                        && winery.getContactInfo().hasEmail()
                        && winery.getEstablishedYear() == 1902));
    }
}
