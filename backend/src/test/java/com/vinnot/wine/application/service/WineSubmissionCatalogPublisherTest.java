package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineCatalogReferencePort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.command.model.WineSubmissionCatalogData;
import com.vinnot.wine.domain.model.Wine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

@ExtendWith(MockitoExtension.class)
class WineSubmissionCatalogPublisherTest {

    @Mock
    private WineCatalogReferencePort catalogReferencePort;
    @Mock
    private WineRepositoryPort wineRepository;
    @Mock
    private RecommendWineService recommendations;
    private WineSubmissionCatalogPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new WineSubmissionCatalogPublisher(catalogReferencePort, wineRepository, recommendations);
    }

    @Test
    void publishesResolvedCatalogDataAndEvaluatesTheImageOnlyWhenPublicationIsPossible() {
        UUID wineryId = UUID.randomUUID();
        UUID countryId = UUID.randomUUID();
        UUID regionId = UUID.randomUUID();
        when(catalogReferencePort.resolveOrCreate(new WineCatalogReferencePort.CatalogSelection(null, "Winery", null, "Argentina", null, "Mendoza")))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        wineryId, "Winery", countryId, "Argentina",
                        regionId, "Mendoza")));
        when(wineRepository.save(any(Wine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = publisher.publish(data("red"), UUID.randomUUID(), () -> "label.jpg");

        assertThat(result).isPresent();
        Wine wine = result.orElseThrow().wine();
        assertThat(wine.getWineType().name()).isEqualTo("RED");
        assertThat(wine.getVintage()).isEqualTo(2022);
        assertThat(wine.getGrapes()).containsExactly("Malbec");
        assertThat(wine.getImageUrl()).isEqualTo("label.jpg");
        assertThat(wine.getCountryId()).isEqualTo(countryId);
        assertThat(result.orElseThrow().summary().wineryName()).isEqualTo("Winery");
        verify(recommendations).recommend(eq(wine), any());
    }

    @Test
    void refusesUnknownTypesAndUnresolvableReferencesWithoutStoringImages() {
        AtomicBoolean imageRequested = new AtomicBoolean();

        assertThat(publisher.publish(
                data("unknown"), UUID.randomUUID(), () -> {
                    imageRequested.set(true);
                    return "image.jpg";
                })).isEmpty();
        assertThat(imageRequested).isFalse();
        verify(catalogReferencePort, never()).resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class));
        verify(wineRepository, never()).save(any());

        when(catalogReferencePort.resolveOrCreate(new WineCatalogReferencePort.CatalogSelection(null, "Winery", null, "Argentina", null, "Mendoza")))
                .thenReturn(Optional.empty());
        assertThat(publisher.publish(data("RED"), UUID.randomUUID(), "image.jpg"))
                .isEmpty();
    }

    @Test
    void refusesBlankWineTypesBeforeResolvingCatalogReferences() {
        assertThat(publisher.publish(data(" "), UUID.randomUUID(), "image.jpg"))
                .isEmpty();

        verify(catalogReferencePort, never()).resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class));
        verify(wineRepository, never()).save(any());
    }

    @Test
    void appliesOnlyMeaningfulAdministratorOverrides() {
        var original = data("RED");
        var override = new WineSubmissionCatalogData(
                " Updated ", " ", null, 2023, List.of(),
                null, "Uco", new BigDecimal("14.5"));

        var merged = original.overrideWith(override);

        assertThat(merged.wineName()).isEqualTo("Updated");
        assertThat(merged.wineryName()).isEqualTo("Winery");
        assertThat(merged.wineType()).isEqualTo("RED");
        assertThat(merged.vintage()).isEqualTo(2023);
        assertThat(merged.grapes()).containsExactly("Malbec");
        assertThat(merged.region()).isEqualTo("Uco");
        assertThat(merged.alcoholContent()).isEqualByComparingTo("14.5");
    }

    private WineSubmissionCatalogData data(String type) {
        return new WineSubmissionCatalogData(
                "Wine", "Winery", type, 2022, List.of("Malbec"),
                "Argentina", "Mendoza", new BigDecimal("14.0"));
    }

    @Test
    void passesTheCatalogPicksToTheReferenceResolution() {
        UUID wineryId = UUID.randomUUID();
        UUID countryId = UUID.randomUUID();
        UUID regionId = UUID.randomUUID();
        var picked = new WineSubmissionCatalogData(
                "Reserve", "Winery", "RED", 2022, List.of("Malbec"), "Argentina", "Mendoza", null,
                wineryId, countryId, regionId);

        publisher.publish(picked, UUID.randomUUID(), () -> null);

        verify(catalogReferencePort).resolveOrCreate(new WineCatalogReferencePort.CatalogSelection(
                wineryId, "Winery", countryId, "Argentina", regionId, "Mendoza"));
    }

}
