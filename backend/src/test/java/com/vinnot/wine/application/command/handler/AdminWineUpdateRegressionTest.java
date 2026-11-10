package com.vinnot.wine.application.command.handler;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import com.vinnot.wine.application.command.model.UpdateWineCommand;
import com.vinnot.wine.application.command.model.CreateWineCommand;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.PriceRange;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.vinnot.wine.application.service.RecommendWineService;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.argThat;

class AdminWineUpdateRegressionTest {
    // Same defaults as the application mapper (spring.jackson.use-jackson2-defaults=true).
    private final ObjectMapper mapper = JsonMapper.builder().configureForJackson2().build();
    private final WineRepositoryPort wines = mock(WineRepositoryPort.class);

    @Test
    void updatingOneScorePreservesCatalogAndTranslations() throws Exception {
        Wine wine = Wine.create("Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        wine.updateBasicInfo("Reserva", 2020, "Reserva", "Español");
        wine.replaceDescriptions("Español", "English");
        wine.updateGrapes(List.of("Malbec"));
        wine.updateServingInfo(new BigDecimal("14"), ServingTemperature.of(14, 18),
                PriceRange.of(BigDecimal.ZERO, BigDecimal.TEN));
        wine.updateTasteProfile(40, 60, 70, 10);
        when(wines.findById(wine.getId())).thenReturn(Optional.of(wine));
        var command = mapper.readValue("{\"wineId\":\"" + wine.getId() + "\",\"bodyScore\":0}", UpdateWineCommand.class);

        new UpdateWineCommandHandler(wines, mock(RecommendWineService.class)).execute(command);

        assertThat(wine.getName()).isEqualTo("Reserva");
        assertThat(wine.getVintage()).isEqualTo(2020);
        assertThat(wine.getDescriptionEn()).isEqualTo("English");
        assertThat(wine.getDescriptionEs()).isEqualTo("Español");
        assertThat(wine.getGrapes()).containsExactly("Malbec");
        assertThat(wine.getServingTemperature().getMaxTemp()).isEqualTo(18);
        assertThat(wine.getPriceRange().getMinPrice()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(wine.getTasteProfile().getBody()).isZero();
        assertThat(wine.getTasteProfile().getAcidity()).isEqualTo(40);
        verify(wines).save(wine);
    }

    @Test
    void explicitClearRemovesOnlyTheRequestedOptionalField() throws Exception {
        Wine wine = Wine.create("Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        wine.replaceDescriptions("Español", "English");
        when(wines.findById(wine.getId())).thenReturn(Optional.of(wine));
        var command = mapper.readValue("{\"wineId\":\"" + wine.getId()
                + "\",\"clearFields\":[\"descriptionEn\"]}", UpdateWineCommand.class);
        new UpdateWineCommandHandler(wines, mock(RecommendWineService.class)).execute(command);
        assertThat(wine.getDescriptionEn()).isNull();
        assertThat(wine.getDescriptionEs()).isEqualTo("Español");
    }

    @Test
    void createsBothDescriptionsScoresAndInactiveFlag() throws Exception {
        when(wines.save(any())).thenAnswer(call -> call.getArgument(0));
        var command = mapper.readValue("{\"name\":\"Reserva\",\"wineryId\":\"" + UUID.randomUUID()
                + "\",\"wineType\":\"RED\",\"descriptionEs\":\"ES\",\"descriptionEn\":\"EN\","
                + "\"bodyScore\":0,\"isActive\":false}", CreateWineCommand.class);
        new CreateWineCommandHandler(wines, mock(RecommendWineService.class)).execute(command);
        verify(wines).save(argThat(wine ->
                "EN".equals(wine.getDescriptionEn()) && "ES".equals(wine.getDescriptionEs())
                        && wine.getTasteProfile().getBody() == 0 && !wine.isActive()));
    }
}
