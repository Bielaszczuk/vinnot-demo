package com.vinnot.community.application.query.handler;

import com.vinnot.community.application.port.out.CommunityProfileAccessPort;
import com.vinnot.community.application.port.out.MemberBadgePort;
import com.vinnot.community.application.port.out.SensoryFamilyPort;
import com.vinnot.community.application.port.out.SocialQueryPort;
import com.vinnot.community.application.port.out.SocialQueryPort.MemberFacts;
import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.application.query.response.SocialProfileSummary;
import com.vinnot.community.application.query.response.SocialProfileSummary.TasteSlice;
import com.vinnot.community.domain.model.CellarVisibility;
import com.vinnot.community.domain.model.TasteScore;
import com.vinnot.community.domain.model.TasteScore.Kind;
import com.vinnot.community.domain.model.TasteWheel.CatalogGrape;
import com.vinnot.community.domain.model.TasteWheel.RatedWine;
import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * #541 S9 and S15: the wheel keeps its five-rated-wines gate, read from the taste table, and its slices come from the
 * member's own ratings, one kind per view, also for members whose cellar is private.
 */
class GetSocialQueryHandlerTasteWheelTest {
    private static final String MENDOZA = "11111111-1111-1111-1111-111111111111";
    private final UUID member = UUID.randomUUID();
    private final SocialQueryPort social = mock(SocialQueryPort.class);
    private final TasteQuizRepositoryPort quizzes = mock(TasteQuizRepositoryPort.class);
    private final TasteAdjustmentRepositoryPort adjustments = mock(TasteAdjustmentRepositoryPort.class);
    private final GetSocialQueryHandler handler = new GetSocialQueryHandler(social,
            mock(CommunityProfileAccessPort.class), mock(MemberBadgePort.class), mock(SensoryFamilyPort.class), quizzes,
            adjustments, new PublicAvatarUrlResolver("https://api.vinnot.test/api"));

    @BeforeEach
    void defaults() {
        facts(CellarVisibility.PUBLIC);
        when(quizzes.find(member)).thenReturn(Optional.empty());
        when(adjustments.find(member)).thenReturn(Map.of());
        when(social.ratedWines(member)).thenReturn(List.of(
                new RatedWine(new BigDecimal("4.5"), "RED", List.of("Syrah"), MENDOZA, "Mendoza"),
                new RatedWine(new BigDecimal("3.5"), "ROSE", List.of("Syrah"), null, null)));
        when(social.grapeCatalog()).thenReturn(List.of(new CatalogGrape("Syrah", null, "RED")));
    }

    @Test
    void theWheelStaysMissingWithoutReadingRatingsWhileTheTasteTableHasFewerThanFiveRatedWines() {
        tastes(4);
        assertThat(handler.profile(null, member).tasteWheel()).isNull();
        verify(social, never()).ratedWines(any());
        verify(social, never()).grapeCatalog();
    }

    @Test
    void fiveRatedWinesShowGrapeTypeAndRegionSlicesWithToneAndRatedWines() {
        tastes(5);
        assertThat(handler.profile(null, member).tasteWheel()).containsExactly(
                new TasteSlice("GRAPE", "syrah", "Syrah", new BigDecimal("4.00"), "RED", 2),
                new TasteSlice("TYPE", "RED", "RED", new BigDecimal("4.50"), "RED", 1),
                new TasteSlice("TYPE", "ROSE", "ROSE", new BigDecimal("3.50"), "ROSE", 1),
                new TasteSlice("REGION", MENDOZA, "Mendoza", new BigDecimal("4.50"), null, 1));
    }

    @Test
    void aPrivateCellarStillShowsTheAggregatedWheelButNoCellarCount() {
        facts(CellarVisibility.PRIVATE);
        tastes(5);
        SocialProfileSummary summary = handler.profile(null, member);
        assertThat(summary.cellarVisible()).isFalse();
        assertThat(summary.cellarCount()).isNull();
        assertThat(summary.tasteWheel()).extracting(TasteSlice::kind).containsExactly("GRAPE", "TYPE", "TYPE",
                "REGION");
    }

    private void facts(CellarVisibility visibility) {
        when(social.memberFacts(member, null)).thenReturn(Optional.of(new MemberFacts(visibility, false, false, 0, 0, 0,
                3)));
    }

    private void tastes(int ratedWines) {
        when(social.tastes(anyCollection())).thenReturn(Map.of(member,
                List.of(new TasteScore(Kind.TYPE, "RED", "RED", new BigDecimal("4.00"), ratedWines))));
    }
}
