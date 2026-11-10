package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.wine.application.port.out.WineProfileOverviewPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.query.model.GetWineByIdQuery;
import com.vinnot.wine.application.query.response.WineDetailsResponse;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GetWineByIdQueryHandlerTest {

    private static final int VINTAGE = 2020;
    private static final int SERVING_MIN = 16;
    private static final int SERVING_MAX = 18;
    private static final int RATING_COUNT = 8;
    private static final int ESTABLISHED_YEAR = 1998;
    private static final String WINE_NAME = "Vinnot Reserva";
    private static final String WINERY_NAME = "Bodega Vinnot";
    private static final String COUNTRY = "Argentina";
    private static final String REGION = "Mendoza";
    private static final String SUBREGION = "Lujan de Cuyo";
    private static final String DESCRIPTION = "Vino tinto de guarda.";
    private static final Instant CREATED_AT = Instant.parse("2026-01-01T00:00:00Z");
    private static final BigDecimal ALCOHOL_CONTENT = new BigDecimal("13.50");
    private static final BigDecimal PRICE_MIN = new BigDecimal("15.00");
    private static final BigDecimal PRICE_MAX = new BigDecimal("25.00");
    private static final BigDecimal RATING_AVERAGE = new BigDecimal("4.25");
    private static final BigDecimal LATITUDE = new BigDecimal("-32.8895");
    private static final BigDecimal LONGITUDE = new BigDecimal("-68.8458");

    private final WineRepositoryPort wineRepository = mock(WineRepositoryPort.class);
    private final WineryQueryPort wineryQueryPort = mock(WineryQueryPort.class);
    private final WineProfileOverviewPort profiles =
            mock(WineProfileOverviewPort.class);
    private final GetWineByIdQueryHandler handler =
            new GetWineByIdQueryHandler(wineRepository, wineryQueryPort, profiles);

    @Test
    void inactiveWineIsHiddenFromThirdPartiesButNotOwnerOrCatalogStaff() {
        UUID owner = UUID.randomUUID();
        Wine wine = Wine.create(WINE_NAME, null, WineType.RED, owner);
        wine.deactivate();
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        assertThatThrownBy(() -> handler.execute(new GetWineByIdQuery(wine.getId())))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> handler.execute(new GetWineByIdQuery(wine.getId(),
                new ResourceReader(UUID.randomUUID(), false))))
                .isInstanceOf(EntityNotFoundException.class);
        assertThat(handler.execute(new GetWineByIdQuery(wine.getId(),
                new ResourceReader(owner, false))).id()).isEqualTo(wine.getId());
        assertThat(handler.execute(new GetWineByIdQuery(wine.getId(),
                ResourceReader.staff())).id()).isEqualTo(wine.getId());
    }

    @Test
    void executeReturnsWineDetailsWithNestedWineryInfo() {
        UUID wineId = UUID.randomUUID();
        UUID wineryId = UUID.randomUUID();
        Wine wine = wine(wineId, wineryId);

        when(wineRepository.findById(wineId)).thenReturn(Optional.of(wine));
        var overview = new WineProfileOverviewPort.Overview(
                "Generated sensory summary", 60, 40, 70, 5, List.of("Lamb"));
        when(profiles.findByWineId(wineId)).thenReturn(Map.of("en", overview));
        when(wineryQueryPort.findById(wineryId)).thenReturn(Optional.of(winery(wineryId)));

        WineDetailsResponse response = handler.execute(new GetWineByIdQuery(wineId));

        assertThat(response.id()).isEqualTo(wineId);
        assertThat(response.profileOverview()).containsEntry("en", overview);
        assertThat(response.descriptionEs()).isEqualTo(wine.getDescriptionEs());
        assertThat(response.name()).isEqualTo(WINE_NAME);
        assertThat(response.wineryName()).isEqualTo(WINERY_NAME);
        assertThat(response.region()).isEqualTo(REGION);
        assertThat(response.country()).isEqualTo(COUNTRY);
        assertThat(response.wineType()).isEqualTo(WineType.RED.name());
        assertThat(response.grapes()).containsExactly("Malbec");
        assertThat(response.servingTempMin()).isEqualTo(SERVING_MIN);
        assertThat(response.servingTempMax()).isEqualTo(SERVING_MAX);
        assertThat(response.priceMin()).isEqualByComparingTo(PRICE_MIN);
        assertThat(response.priceMax()).isEqualByComparingTo(PRICE_MAX);
        assertThat(response.winery()).isNotNull();
        assertThat(response.winery().subregion()).isEqualTo(SUBREGION);
        assertThat(response.winery().latitude()).isEqualByComparingTo(LATITUDE);
        assertThat(response.winery().longitude()).isEqualByComparingTo(LONGITUDE);
    }

    @Test
    void executeReturnsWineDetailsWhenWineryDataIsMissing() {
        UUID wineId = UUID.randomUUID();
        UUID wineryId = UUID.randomUUID();

        when(wineRepository.findById(wineId)).thenReturn(Optional.of(wine(wineId, wineryId)));
        when(wineryQueryPort.findById(wineryId)).thenReturn(Optional.empty());

        WineDetailsResponse response = handler.execute(new GetWineByIdQuery(wineId));

        assertThat(response.id()).isEqualTo(wineId);
        assertThat(response.wineryName()).isNull();
        assertThat(response.winery()).isNull();
    }

    @Test
    void executeThrowsEntityNotFoundWhenWineDoesNotExist() {
        UUID wineId = UUID.randomUUID();
        when(wineRepository.findById(wineId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.execute(new GetWineByIdQuery(wineId)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Wine not found");

        verify(wineRepository).findById(wineId);
    }

    private static Wine wine(UUID wineId, UUID wineryId) {
        return Wine.builder()
                .id(wineId)
                .name(WINE_NAME)
                .wineryId(wineryId)
                .vintage(VINTAGE)
                .wineType(WineType.RED)
                .style("Reserva")
                .grapes(List.of("Malbec"))
                .allergens(List.of("Sulfitos"))
                .descriptionEs(DESCRIPTION)
                .alcoholContent(ALCOHOL_CONTENT)
                .servingTemperature(ServingTemperature.of(SERVING_MIN, SERVING_MAX))
                .priceRange(PriceRange.of(PRICE_MIN, PRICE_MAX))
                .rating(Rating.of(RATING_AVERAGE, RATING_COUNT))
                .createdAt(CREATED_AT)
                .updatedAt(CREATED_AT)
                .active(true)
                .build();
    }

    private static WineryQueryPort.WineryData winery(UUID wineryId) {
        return new WineryQueryPort.WineryData(
                wineryId,
                WINERY_NAME,
                COUNTRY,
                REGION,
                SUBREGION,
                "Bodega de Mendoza.",
                "https://vinnot.example",
                "contacto@vinnot.example",
                "+54 261 000000",
                "Ruta del vino 123",
                LATITUDE,
                LONGITUDE,
                "https://cdn.example/logo.png",
                ESTABLISHED_YEAR
        );
    }
}
