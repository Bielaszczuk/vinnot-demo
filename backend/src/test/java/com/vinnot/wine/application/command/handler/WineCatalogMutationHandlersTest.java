package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.command.model.CreateWineCommand;
import com.vinnot.wine.application.command.model.DeleteWineCommand;
import com.vinnot.wine.application.command.model.ToggleWineActiveCommand;
import com.vinnot.wine.application.command.model.ToggleWineFeaturedCommand;
import com.vinnot.wine.application.command.model.UpdateWineCommand;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.service.RecommendWineService;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;

class WineCatalogMutationHandlersTest {

    private WineRepositoryPort repository;
    private final RecommendWineService recommendations = mock(RecommendWineService.class);

    @BeforeEach
    void setUp() {
        repository = mock(WineRepositoryPort.class);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsCompleteFeaturedWineAndReturnsPersistedIdentity() {
        UUID wineryId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        CreateWineCommand command = new CreateWineCommand(
                "Gran Reserva", wineryId, "red", 2021, "Structured",
                List.of("Malbec"), List.of("Sulfites"), "Descripción", "Description",
                new BigDecimal("14.5"), 16, 18, new BigDecimal("10"),
                new BigDecimal("20"), "https://images.test/wine.jpg", true, creatorId);

        UUID id = new CreateWineCommandHandler(repository, recommendations).execute(command);

        ArgumentCaptor<Wine> captor = ArgumentCaptor.forClass(Wine.class);
        verify(repository).save(captor.capture());
        Wine saved = captor.getValue();
        assertThat(id).isEqualTo(saved.getId());
        assertThat(saved.getName()).isEqualTo("Gran Reserva");
        assertThat(saved.getWineType()).isEqualTo(WineType.RED);
        assertThat(saved.getServingTemperature().getMinTemp()).isEqualTo(16);
        assertThat(saved.getPriceRange().getMinPrice()).isEqualByComparingTo("10");
        assertThat(saved.getGrapes()).containsExactly("Malbec");
        assertThat(saved.isFeatured()).isTrue();
        verify(recommendations).recommend(eq(saved), any());
    }

    @Test
    void updatesAllAdminAndTasteFieldsIncludingLifecycleChanges() {
        Wine wine = Wine.create("Original", UUID.randomUUID(), WineType.WHITE, UUID.randomUUID());
        wine.updateTasteProfile(10, 20, 30, 40);
        when(repository.findById(wine.getId())).thenReturn(Optional.of(wine));
        UUID wineryId = UUID.randomUUID();
        UpdateWineCommand command = command(wine.getId(), wineryId, "rose", true, false,
                90, null, 70, null);

        new UpdateWineCommandHandler(repository, recommendations).execute(command);

        assertThat(wine.getName()).isEqualTo("Updated");
        assertThat(wine.getWineryId()).isEqualTo(wineryId);
        assertThat(wine.getWineType()).isEqualTo(WineType.ROSE);
        assertThat(wine.isFeatured()).isTrue();
        assertThat(wine.isActive()).isFalse();
        assertThat(wine.getTasteProfile().getAcidity()).isEqualTo(90);
        assertThat(wine.getTasteProfile().getTannin()).isEqualTo(20);
        assertThat(wine.getTasteProfile().getBody()).isEqualTo(70);
        assertThat(wine.getTasteProfile().getSweetness()).isEqualTo(40);
        verify(repository).save(wine);
    }

    @Test
    void activatesWithoutRetogglingAndCreatesTasteProfileFromPartialScores() {
        Wine wine = Wine.create("Original", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        wine.deactivate();
        when(repository.findById(wine.getId())).thenReturn(Optional.of(wine));

        new UpdateWineCommandHandler(repository, recommendations).execute(command(
                wine.getId(), null, null, false, true, null, 55, null, null));

        assertThat(wine.isActive()).isTrue();
        assertThat(wine.isFeatured()).isFalse();
        assertThat(wine.getTasteProfile().getTannin()).isEqualTo(55);
        assertThat(wine.getTasteProfile().getAcidity()).isNull();
    }

    @Test
    void featuringAWineFromTheEditFormRecommendsItOnlyWhenItBecomesFeatured() {
        Wine wine = Wine.create("Original", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(repository.findById(wine.getId())).thenReturn(Optional.of(wine));

        new UpdateWineCommandHandler(repository, recommendations).execute(command(
                wine.getId(), null, null, true, null, null, null, null, null));
        new UpdateWineCommandHandler(repository, recommendations).execute(command(
                wine.getId(), null, null, true, null, null, null, null, null));

        assertThat(wine.isFeatured()).isTrue();
        verify(recommendations, times(1)).recommend(eq(wine), any());
    }

    @Test
    void createsTasteProfileFromASweetnessOnlyUpdate() {
        Wine wine = Wine.create("Original", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(repository.findById(wine.getId())).thenReturn(Optional.of(wine));

        new UpdateWineCommandHandler(repository, recommendations).execute(command(
                wine.getId(), null, null, null, null,
                null, null, null, 35));

        assertThat(wine.getTasteProfile().getSweetness()).isEqualTo(35);
        assertThat(wine.getTasteProfile().getBody()).isNull();
    }

    @Test
    void reportsMissingWineWithoutPersisting() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> new UpdateWineCommandHandler(repository, recommendations).execute(
                command(id, null, null, null, null, null, null, null, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void togglesCatalogVisibilityThroughAggregateBehavior() {
        Wine wine = Wine.create("Wine", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(repository.findById(wine.getId())).thenReturn(Optional.of(wine));

        new ToggleWineActiveCommandHandler(repository)
                .execute(new ToggleWineActiveCommand(wine.getId()));
        new ToggleWineFeaturedCommandHandler(repository, recommendations)
                .execute(new ToggleWineFeaturedCommand(wine.getId()));

        assertThat(wine.isActive()).isFalse();
        assertThat(wine.isFeatured()).isTrue();
        verify(recommendations).recommend(eq(wine), any());

        new ToggleWineFeaturedCommandHandler(repository, recommendations)
                .execute(new ToggleWineFeaturedCommand(wine.getId()));
        assertThat(wine.isFeatured()).isFalse();
        verify(recommendations, times(1)).recommend(any(), any());
    }

    @Test
    void deletesAnExistingWineAndRejectsAnUnknownOne() {
        Wine wine = Wine.create(
                "Wine", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(repository.findById(wine.getId())).thenReturn(Optional.of(wine));
        DeleteWineCommandHandler handler = new DeleteWineCommandHandler(repository);

        handler.execute(new DeleteWineCommand(wine.getId()));
        verify(repository).delete(wine);

        UUID missing = UUID.randomUUID();
        when(repository.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new DeleteWineCommand(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private UpdateWineCommand command(
            UUID id, UUID wineryId, String wineType, Boolean featured, Boolean active,
            Integer acidity, Integer tannin, Integer body, Integer sweetness) {
        return new UpdateWineCommand(id, "Updated", wineryId, wineType, 2022,
                "Fresh", List.of("Malbec"), List.of("Sulfites"), "Descripción",
                "Description", new BigDecimal("13.5"), 14, 16,
                new BigDecimal("12"), new BigDecimal("24"),
                "https://images.test/updated.jpg", featured, active,
                acidity, tannin, body, sweetness);
    }
}
