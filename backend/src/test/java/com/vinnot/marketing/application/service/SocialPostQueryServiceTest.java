package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.model.WineDayResponse;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.DateRule;
import com.vinnot.marketing.domain.model.PillarPerformance;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.marketing.domain.model.WineDayKind;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** S7: the queue is read by status and date in Argentina time; the calendar and the pillars come from the seeds. */
class SocialPostQueryServiceTest {
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);
    private final SocialMetricsRepository metrics = mock(SocialMetricsRepository.class);
    private final SocialPostQueryService service = new SocialPostQueryService(posts, wineDays, pillars,
            new SocialPostPresenter(pillars, wineDays, WeeklyPlanner.Settings.defaults(), ids -> Map.of(),
                    mock(SocialPublicationRepository.class), mock(SocialMetricsRepository.class), PublishingFixtures.SETTINGS),
            WeeklyPlanner.Settings.defaults(),
            new PillarPerformanceService(metrics, 90, Clock.fixed(MarketingFixtures.NOW, ZoneOffset.UTC)));

    @BeforeEach
    void catalogs() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of(MarketingFixtures.MERLOT, new WineDay("TEMPRANILLO", "Día Internacional del Tempranillo",
                "International Tempranillo Day", WineDayKind.GRAPE, DateRule.parse("nth-weekday:11:THU:2"), 1, "ES")));
    }

    @Test
    void searchesByStatusAndLocalDatesAndPresentsEachPost() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.search(SocialPostStatus.PENDING_APPROVAL, Instant.parse("2026-11-02T03:00:00Z"), Instant.parse("2026-11-16T02:59:59Z"), 0, 20))
                .thenReturn(PageResult.of(List.of(post), 0, 20, 1));

        PageResult<SocialPostAdminResponse> page = service.search(SocialPostStatus.PENDING_APPROVAL, LocalDate.of(2026, 11, 2),
                LocalDate.of(2026, 11, 15), 0, 20);

        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content().get(0).id()).isEqualTo(post.id());
        when(posts.search(null, null, null, 1, 5)).thenReturn(PageResult.of(List.of(), 1, 5, 0));
        assertThat(service.search(null, null, null, 1, 5).content()).isEmpty();
    }

    @Test
    void boundsThePageAndItsSizeSoTheQueryNeverGetsANegativeOrHugeLimit() {
        when(posts.search(null, null, null, 0, 100)).thenReturn(PageResult.of(List.of(), 0, 100, 0));
        when(posts.search(null, null, null, 0, 1)).thenReturn(PageResult.of(List.of(), 0, 1, 0));
        assertThat(service.search(null, null, null, -3, 5000).size()).isEqualTo(100);
        assertThat(service.search(null, null, null, -1, -20).size()).isEqualTo(1);
    }

    @Test
    void getsOnePostOrFails() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        assertThat(service.get(post.id()).id()).isEqualTo(post.id());
        assertThatThrownBy(() -> service.get(UUID.randomUUID())).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void listsTheWineDaysOfAYearSortedByDateAndThePillarsInOrder() {
        List<WineDayResponse> days = service.wineDays(2026);
        assertThat(days).containsExactly(
                new WineDayResponse("MERLOT", "Día Internacional del Merlot", "International Merlot Day", WineDayKind.GRAPE, 1, null,
                        LocalDate.of(2026, 11, 7)),
                new WineDayResponse("TEMPRANILLO", "Día Internacional del Tempranillo", "International Tempranillo Day", WineDayKind.GRAPE, 1,
                        "ES", LocalDate.of(2026, 11, 12)));
        assertThat(service.wineDays(2027)).extracting(WineDayResponse::date).containsExactly(LocalDate.of(2027, 11, 7), LocalDate.of(2027, 11, 11));
        ContentPillarResponse.Performance unmeasured = new ContentPillarResponse.Performance(0, 0, 0, 1.0);
        assertThat(service.pillars()).containsExactly(
                new ContentPillarResponse("WINE_DAY", "Día del vino", "Wine day", 3, true, false, unmeasured),
                new ContentPillarResponse("CURIOUS_FACT", "Dato curioso", "Curious fact", 2, true, false, unmeasured),
                new ContentPillarResponse("EDUCATION", "Educación", "Education", 2, true, false, unmeasured),
                new ContentPillarResponse("APP_FEATURE", "Función de la app", "App feature", 1, true, false, unmeasured));
    }

    @Test
    void thePillarsCarryTheirSwitchesAndTheirLastNinetyDaysOfPerformance() {
        when(metrics.pillarPerformance(Instant.parse("2026-08-04T12:00:00Z"))).thenReturn(List.of(
                new PillarPerformance("CURIOUS_FACT", 3, 1024, 128), new PillarPerformance("EDUCATION", 3, 1024, 384)));

        assertThat(service.pillars()).extracting(ContentPillarResponse::code).containsExactly("WINE_DAY", "CURIOUS_FACT", "EDUCATION",
                "APP_FEATURE");
        assertThat(service.pillars().get(1).performance()).isEqualTo(new ContentPillarResponse.Performance(3, 1024, 128, 0.5));
        assertThat(service.pillars().get(2).performance()).isEqualTo(new ContentPillarResponse.Performance(3, 1024, 384, 1.5));
    }
}
