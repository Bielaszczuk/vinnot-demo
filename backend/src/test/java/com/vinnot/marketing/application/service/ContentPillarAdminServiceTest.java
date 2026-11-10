package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.domain.exception.LastRotatingPillarException;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.PillarPerformance;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** #510 S8 and S13: the admin turns a pillar's auto-approval or the pillar itself on and off and gets the pillar back. */
class ContentPillarAdminServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final SocialMetricsRepository metrics = mock(SocialMetricsRepository.class);
    private final ContentPillarAdminService service = new ContentPillarAdminService(pillars,
            new PillarPerformanceService(metrics, 90, Clock.fixed(NOW, ZoneOffset.UTC)));

    @BeforeEach
    void measured() {
        when(metrics.pillarPerformance(any())).thenReturn(List.of(new PillarPerformance("CURIOUS_FACT", 2, 400, 40)));
    }

    @Test
    void turningAutoApprovalOnStoresItAndReturnsThePillar() {
        when(pillars.all()).thenReturn(List.of(new ContentPillar("CURIOUS_FACT", "Dato", "Fact", 2, "b", "b", 2, true, true)));

        ContentPillarResponse pillar = service.setAutoApprove("CURIOUS_FACT", true);

        verify(pillars).setAutoApprove("CURIOUS_FACT", true);
        assertThat(pillar).isEqualTo(new ContentPillarResponse("CURIOUS_FACT", "Dato", "Fact", 2, true, true,
                new ContentPillarResponse.Performance(2, 400, 40, 1.0)));
    }

    @Test
    void switchingAPillarOffStoresItAndReturnsThePillar() {
        ContentPillar quiz = new ContentPillar("QUIZ", "Quiz", "Quiz", 1, "b", "b", 5, false, true);
        when(pillars.all()).thenReturn(List.of(new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8, false, true), quiz),
                List.of(new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8, false, false), quiz));

        ContentPillarResponse pillar = service.setActive("HUMOR", false);

        verify(pillars).setActive("HUMOR", false);
        assertThat(pillar.active()).isFalse();
        assertThat(pillar.performance()).isEqualTo(new ContentPillarResponse.Performance(0, 0, 0, 1.0));
    }

    @Test
    void theLastActiveRotatingPillarCannotBeSwitchedOff() {
        when(pillars.all()).thenReturn(List.of(new ContentPillar("WINE_DAY", "Día", "Day", 3, "b", "b", 1, false, true),
                new ContentPillar("QUIZ", "Quiz", "Quiz", 1, "b", "b", 5, false, true),
                new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8, false, false),
                new ContentPillar("APP_FEATURE", "App", "App", 1, "b", "b", 9, false, true)));

        assertThatThrownBy(() -> service.setActive("QUIZ", false)).isInstanceOf(LastRotatingPillarException.class)
                .hasMessageContaining("QUIZ");
        verify(pillars, never()).setActive("QUIZ", false);

        service.setActive("WINE_DAY", false);
        verify(pillars).setActive("WINE_DAY", false);
    }

    @Test
    void anUnknownPillarIsNotFound() {
        doThrow(new EntityNotFoundException("ContentPillar", "NOPE")).when(pillars).setActive("NOPE", true);
        assertThatThrownBy(() -> service.setActive("NOPE", true)).isInstanceOf(EntityNotFoundException.class);

        when(pillars.all()).thenReturn(List.of());
        assertThatThrownBy(() -> service.setAutoApprove("GONE", false)).as("removed between the update and the read")
                .isInstanceOf(EntityNotFoundException.class).hasMessageContaining("GONE");
    }
}
