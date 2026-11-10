package com.vinnot.wineroute.application.command.handler;

import java.util.Objects;
import com.vinnot.shared.application.port.RouteDistanceService;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wineroute.application.command.model.CreateWineRouteCommand;
import com.vinnot.wineroute.application.command.model.ArchiveWineRouteCommand;
import com.vinnot.wineroute.application.command.model.DeleteWineRouteCommand;
import com.vinnot.wineroute.application.command.model.PublishWineRouteCommand;
import com.vinnot.wineroute.application.command.model.UpdateWineRouteCommand;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import com.vinnot.wineroute.domain.valueobject.RouteStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.shared.application.media.CoverImageUseCase;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wineroute.domain.model.RouteStop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

class WineRouteMutationHandlersTest {

    private WineRouteRepositoryPort repository;
    private RouteDistanceService distanceService;

    @BeforeEach
    void setUp() {
        repository = mock(WineRouteRepositoryPort.class);
        distanceService = mock(RouteDistanceService.class);
    }

    @Test
    void createsPublishedRouteAndDerivesDurationAndDistanceFromStops() {
        when(distanceService.calculateTotalDistanceKm(any())).thenReturn(42.5);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        CreateWineRouteCommand command = new CreateWineRouteCommand(
                "Ruta", "Descripción", "Argentina", "Mendoza", "Valle de Uco",
                30, 1, 10.0, "medium", "image", List.of("RED"), "map",
                UUID.randomUUID(), "published", List.of(
                createStop("Primera", 0, 45, "-32.9", "-68.8"),
                createStop("Segunda", 4, null, null, null)));

        UUID id = new CreateWineRouteCommandHandler(repository, coverImages(), distanceService).execute(command);

        ArgumentCaptor<WineRoute> captor = ArgumentCaptor.forClass(WineRoute.class);
        verify(repository).save(captor.capture());
        WineRoute route = captor.getValue();
        assertThat(id).isEqualTo(route.getId());
        assertThat(route.getStatus()).isEqualTo(RouteStatus.PUBLISHED);
        assertThat(route.getDifficulty()).isEqualTo(RouteDifficulty.MEDIUM);
        assertThat(route.getEstimatedDurationMinutes()).isEqualTo(45);
        assertThat(route.getTotalDistanceKm()).isEqualTo(42.5);
        assertThat(route.getStops()).extracting(stop -> stop.getStopOrder())
                .containsExactly(1, 4);
    }

    @Test
    void createsDraftOrArchivedRoutesWithoutInlineStops() {
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        CreateWineRouteCommandHandler handler =
                new CreateWineRouteCommandHandler(repository, coverImages(), distanceService);

        handler.execute(createCommand(null, null));
        handler.execute(createCommand("draft", List.of()));
        assertThatThrownBy(() -> handler.execute(createCommand("invalid", List.of())))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> handler.execute(createCommand("published", List.of())))
                .isInstanceOf(DomainException.class);
        handler.execute(createCommand("archived", null));

        ArgumentCaptor<WineRoute> captor = ArgumentCaptor.forClass(WineRoute.class);
        verify(repository, times(3)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(WineRoute::getStatus)
                .containsExactly(RouteStatus.DRAFT, RouteStatus.DRAFT, RouteStatus.ARCHIVED);
    }

    @Test
    void updatesEveryEditableFieldAndPublishesWithRecalculatedStops() {
        UUID routeId = UUID.randomUUID();
        WineRoute route = WineRoute.create("Original", UUID.randomUUID());
        when(repository.findById(routeId)).thenReturn(Optional.of(route));
        when(distanceService.calculateTotalDistanceKm(any())).thenReturn(88.0);
        UpdateWineRouteCommand command = new UpdateWineRouteCommand(
                routeId, "Updated", "Description", "Argentina", "Salta", "Cafayate",
                10, 2, 20.0, "long", "image", "map", List.of("WHITE"),
                List.of(updateStop("Stop", 0, 60)), "active");

        new UpdateWineRouteCommandHandler(repository, coverImages(), distanceService).execute(command);

        assertThat(route.getName()).isEqualTo("Updated");
        assertThat(route.getDifficulty()).isEqualTo(RouteDifficulty.LONG);
        assertThat(route.getEstimatedDurationMinutes()).isEqualTo(60);
        assertThat(route.getTotalDistanceKm()).isEqualTo(88.0);
        assertThat(route.getStatus()).isEqualTo(RouteStatus.PUBLISHED);
        assertThat(route.getImageUrl()).isEqualTo("image");
        verify(repository).save(route);
    }

    @Test
    void preservesSparseValuesButRejectsInvalidDifficultyAndStatus() {
        UUID routeId = UUID.randomUUID();
        WineRoute route = WineRoute.create("Original", UUID.randomUUID());
        route.replaceStops(List.of(RouteStop.create("Stop", 1)));
        when(repository.findById(routeId)).thenReturn(Optional.of(route));
        UpdateWineRouteCommandHandler handler =
                new UpdateWineRouteCommandHandler(repository, coverImages(), distanceService);

        assertThatThrownBy(() -> handler.execute(new UpdateWineRouteCommand(routeId, null, null, null, null, null,
                null, null, null, "invalid", null, null, null, null, null)))
                .isInstanceOf(IllegalArgumentException.class);
        handler.execute(statusCommand(routeId, null));
        handler.execute(statusCommand(routeId, "archived"));
        handler.execute(statusCommand(routeId, "draft"));
        assertThatThrownBy(() -> handler.execute(statusCommand(routeId, "ignored")))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(route.getName()).isEqualTo("Original");
        assertThat(route.getDifficulty()).isNull();
        assertThat(route.getStatus()).isEqualTo(RouteStatus.DRAFT);
    }

    @Test
    void lastStopCanBeRemovedOnlyWhenTheRouteIsNotPublished() {
        WineRoute route = WineRoute.create("Route", UUID.randomUUID());
        route.replaceStops(List.of(RouteStop.create("Winery", 1)));
        route.publish();
        when(repository.findById(route.getId())).thenReturn(Optional.of(route));
        var handler = new UpdateWineRouteCommandHandler(repository, coverImages(), distanceService);
        var remove = new UpdateWineRouteCommand(route.getId(), null, null, null, null, null,
                null, null, null, null, null, null, List.of(), List.of(), null);
        assertThatThrownBy(() -> handler.execute(remove))
                .isInstanceOf(DomainException.class);
        verify(repository, never()).save(any());
        handler.execute(new UpdateWineRouteCommand(route.getId(), null, null, null, null, null,
                null, null, null, null, null, null, List.of(), List.of(), "draft"));
        assertThat(route.getStops()).isEmpty();
        assertThat(route.getStatus()).isEqualTo(RouteStatus.DRAFT);
        verify(repository).save(route);
    }

    @Test
    void rejectsUpdatesForUnknownRoutes() {
        UUID routeId = UUID.randomUUID();
        when(repository.findById(routeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> new UpdateWineRouteCommandHandler(repository, coverImages(), distanceService)
                .execute(statusCommand(routeId, "draft")))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void publishesArchivesAndDeletesExistingRoutes() {
        UUID publishId = UUID.randomUUID();
        UUID archiveId = UUID.randomUUID();
        UUID deleteId = UUID.randomUUID();
        WineRoute publishRoute = WineRoute.create("Publish", UUID.randomUUID());
        publishRoute.replaceStops(List.of(
                RouteStop.create("Winery", 1)));
        WineRoute archiveRoute = WineRoute.create("Archive", UUID.randomUUID());
        WineRoute deleteRoute = WineRoute.create("Delete", UUID.randomUUID());
        when(repository.findById(publishId)).thenReturn(Optional.of(publishRoute));
        when(repository.findById(archiveId)).thenReturn(Optional.of(archiveRoute));
        when(repository.findById(deleteId)).thenReturn(Optional.of(deleteRoute));

        new PublishWineRouteCommandHandler(repository)
                .execute(new PublishWineRouteCommand(publishId));
        new ArchiveWineRouteCommandHandler(repository)
                .execute(new ArchiveWineRouteCommand(archiveId));
        new DeleteWineRouteCommandHandler(repository, coverImages())
                .execute(new DeleteWineRouteCommand(deleteId));

        assertThat(publishRoute.getStatus()).isEqualTo(RouteStatus.PUBLISHED);
        assertThat(archiveRoute.getStatus()).isEqualTo(RouteStatus.ARCHIVED);
        verify(repository).save(publishRoute);
        verify(repository).save(archiveRoute);
        verify(repository).delete(deleteRoute);
    }

    @Test
    void reportsMissingRoutesAcrossLifecycleCommands() {
        UUID missing = UUID.randomUUID();
        when(repository.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> new PublishWineRouteCommandHandler(repository)
                .execute(new PublishWineRouteCommand(missing)))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> new ArchiveWineRouteCommandHandler(repository)
                .execute(new ArchiveWineRouteCommand(missing)))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> new DeleteWineRouteCommandHandler(repository, coverImages())
                .execute(new DeleteWineRouteCommand(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private CreateWineRouteCommand createCommand(
            String status, List<CreateWineRouteCommand.StopData> stops) {
        return new CreateWineRouteCommand("Route", null, null, null, null,
                null, null, null, null, null, null, null,
                UUID.randomUUID(), status, stops);
    }

    private CreateWineRouteCommand.StopData createStop(
            String name, int order, Integer duration, String latitude, String longitude) {
        return new CreateWineRouteCommand.StopData(name, null, "WINERY", null,
                Objects.isNull(latitude) ? null : new BigDecimal(latitude),
                Objects.isNull(longitude) ? null : new BigDecimal(longitude), order, duration);
    }

    private UpdateWineRouteCommand.StopData updateStop(
            String name, int order, Integer duration) {
        return new UpdateWineRouteCommand.StopData(name, null, "WINERY", null,
                new BigDecimal("-32.9"), new BigDecimal("-68.8"), order, duration);
    }

    private UpdateWineRouteCommand statusCommand(UUID routeId, String status) {
        return new UpdateWineRouteCommand(routeId, null, null, null, null, null,
                null, null, null, null, null, null, null, null, status);
    }
    private CoverImageUseCase coverImages() {
        var images = mock(CoverImageUseCase.class);
        lenient().when(images.validateReference(any(),
                any(), any()))
                .thenAnswer(call -> call.getArgument(0));
        return images;
    }

}
