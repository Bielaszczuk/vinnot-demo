package com.vinnot.wine.application.service;

import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.wine.application.port.out.TasteAudience;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.TasteAffinity;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RecommendWineServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-21T15:00:00Z");
    private final TasteAudience audience = mock(TasteAudience.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final RecommendWineService service = new RecommendWineService(audience, pushes);
    private final UUID creator = UUID.randomUUID();
    private final UUID ana = UUID.randomUUID();
    private final UUID bruno = UUID.randomUUID();
    private final UUID carla = UUID.randomUUID();

    @Test
    void peopleWhoLikeTheGrapeOrTheTypeGetOnePushPerReasonThatOpensTheWine() {
        Wine wine = Wine.create("Gran Malbec", UUID.randomUUID(), WineType.RED, creator);
        wine.updateBasicInfo("Gran Malbec", 2021, null, null);
        wine.updateGrapes(Arrays.asList("Malbec", null, "Cabernet Franc"));
        when(audience.matching(new TasteAudience.Candidate(wine.getId(), creator, WineType.RED, List.of("Malbec", "Cabernet Franc"))))
                .thenReturn(List.of(new TasteAudience.Match(ana, TasteAffinity.Kind.GRAPE, "Malbec"),
                        new TasteAudience.Match(bruno, TasteAffinity.Kind.TYPE, "RED"),
                        new TasteAudience.Match(carla, TasteAffinity.Kind.GRAPE, "Malbec")));

        service.recommend(wine, NOW);

        ArgumentCaptor<PushRequest> sent = ArgumentCaptor.forClass(PushRequest.class);
        verify(pushes, times(2)).push(sent.capture());
        assertThat(sent.getAllValues()).containsExactly(
                new PushRequest(NotificationType.WINE_RECOMMENDATION, List.of(ana, carla),
                        Map.of("wineId", wine.getId().toString(), "wine", "Gran Malbec 2021", "reasonKind", "GRAPE", "reason", "Malbec",
                                NotificationType.CONTENT_REF, "WINE:" + wine.getId()),
                        key(wine, "GRAPE:Malbec"), false, NOW.plus(RecommendWineService.FRESHNESS)),
                new PushRequest(NotificationType.WINE_RECOMMENDATION, List.of(bruno),
                        Map.of("wineId", wine.getId().toString(), "wine", "Gran Malbec 2021", "reasonKind", "TYPE", "reason", "RED",
                                NotificationType.CONTENT_REF, "WINE:" + wine.getId()),
                        key(wine, "TYPE:RED"), false, NOW.plus(RecommendWineService.FRESHNESS)));
    }

    @Test
    void aWineWithoutGrapesOrVintageIsMatchedByTypeAndNobodyMatchingSendsNothing() {
        Wine wine = Wine.create("Rosado", UUID.randomUUID(), WineType.ROSE, null);
        wine.updateGrapes(null);
        when(audience.matching(new TasteAudience.Candidate(wine.getId(), null, WineType.ROSE, List.of())))
                .thenReturn(List.of(new TasteAudience.Match(ana, TasteAffinity.Kind.TYPE, "ROSE")));

        service.recommend(wine, NOW);

        ArgumentCaptor<PushRequest> sent = ArgumentCaptor.forClass(PushRequest.class);
        verify(pushes).push(sent.capture());
        assertThat(sent.getValue().data()).containsEntry("wine", "Rosado");

        Wine nobody = Wine.create("Blanco", UUID.randomUUID(), WineType.WHITE, creator);
        when(audience.matching(any())).thenReturn(List.of());
        service.recommend(nobody, NOW);
        verify(pushes, times(1)).push(any());
    }

    @Test
    void anInactiveWineIsNeverRecommended() {
        Wine wine = Wine.create("Hidden", UUID.randomUUID(), WineType.RED, creator);
        wine.deactivate();

        service.recommend(wine, NOW);

        verifyNoInteractions(audience, pushes);
    }

    private static String key(Wine wine, String reason) {
        return "wine-recommendation:" + wine.getId() + ":" + UUID.nameUUIDFromBytes(reason.getBytes(StandardCharsets.UTF_8));
    }
}
