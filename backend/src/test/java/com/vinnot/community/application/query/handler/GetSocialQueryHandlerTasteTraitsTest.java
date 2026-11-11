package com.vinnot.community.application.query.handler;

import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import com.vinnot.community.application.port.out.CommunityProfileAccessPort;
import com.vinnot.community.application.port.out.MemberBadgePort;
import com.vinnot.community.application.port.out.SensoryFamilyPort;
import com.vinnot.community.application.port.out.SocialQueryPort;
import com.vinnot.community.application.port.out.SocialQueryPort.LikedWineRow;
import com.vinnot.community.application.port.out.SocialQueryPort.MemberFacts;
import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort.StoredTasteQuiz;
import com.vinnot.community.application.query.response.SocialProfileSummary;
import com.vinnot.community.application.query.response.SocialProfileSummary.FamilyShare;
import com.vinnot.community.application.query.response.SocialProfileSummary.TraitScore;
import com.vinnot.community.domain.model.CellarVisibility;
import com.vinnot.community.domain.model.TasteQuiz;
import com.vinnot.community.domain.model.TasteQuizStatus;
import com.vinnot.community.domain.model.TasteScore;
import com.vinnot.community.domain.model.TasteScore.Kind;
import com.vinnot.community.domain.model.TasteTrait;
import com.vinnot.community.domain.model.TasteTraits;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * #541 S9, S10 and S11: the profile's taste traits follow the wheel's threshold, classify aromas through the ai
 * module, fall back to the taste quiz seed where real data is missing and show the member's manual values first.
 */
class GetSocialQueryHandlerTasteTraitsTest {
    private final UUID member = UUID.randomUUID();
    private final SocialQueryPort social = mock(SocialQueryPort.class);
    private final SensoryFamilyPort families = mock(SensoryFamilyPort.class);
    private final TasteQuizRepositoryPort quizzes = mock(TasteQuizRepositoryPort.class);
    private final TasteAdjustmentRepositoryPort adjustments = mock(TasteAdjustmentRepositoryPort.class);
    private final GetSocialQueryHandler handler = new GetSocialQueryHandler(social,
            mock(CommunityProfileAccessPort.class), mock(MemberBadgePort.class), families, quizzes, adjustments,
            new PublicAvatarUrlResolver("https://api.vinnot.test/api"));

    @BeforeEach
    void facts() {
        when(social.memberFacts(member, null)).thenReturn(Optional.of(
                new MemberFacts(CellarVisibility.PUBLIC, false, false, 0, 0, 0, 0)));
        when(quizzes.find(member)).thenReturn(Optional.empty());
        when(adjustments.find(member)).thenReturn(Map.of());
    }

    @Test
    void tasteTraitsAreMissingWhileTheMemberRatedFewerThanFiveWines() {
        tastes(4);
        SocialProfileSummary summary = handler.profile(null, member);
        assertThat(summary.tasteWheel()).isNull();
        assertThat(summary.tasteTraits()).isNull();
        verify(social, never()).likedWines(any(), any(), any(Integer.class));
    }

    @Test
    void tasteTraitsReadTheLikedWinesAndClassifyOnlyProfiledWinesAromas() {
        tastes(5);
        List<String> notes = List.of("Cereza", "Vainilla");
        when(social.likedWines(member, TasteTraits.MIN_LIKED_RATING, TasteTraits.MAX_LIKED_WINES)).thenReturn(List.of(
                row("5", 80d, notes, true), row("4", 50d, notes, true), row("4.5", 60d, notes, true),
                row("4", 90d, List.of("Tiza"), false)));
        when(families.familiesOf(notes)).thenReturn(Set.of("FRUIT", "OAK"));

        SocialProfileSummary summary = handler.profile(null, member);

        assertThat(summary.tasteTraits().structure()).containsExactly(new TraitScore("ACIDITY", 70, 4, false));
        assertThat(summary.tasteTraits().families())
                .containsExactly(new FamilyShare("FRUIT", 100), new FamilyShare("OAK", 100));
        assertThat(summary.tasteTraits().fromQuiz()).isFalse();
        verify(families, never()).familiesOf(List.of("Tiza"));
    }

    @Test
    void underTheThresholdACompletedQuizSeedsTheTasteTraitsButNotTheWheel() {
        tastes(2);
        completedQuiz();
        SocialProfileSummary summary = handler.profile(null, member);
        assertThat(summary.tasteWheel()).isNull();
        assertThat(summary.tasteTraits().fromQuiz()).isTrue();
        // RAINY_DAY tannin+20 body+15, FRUIT acidity+20 body-10, DESSERT acidity+15, DINNER sweetness+10 tannin-10
        assertThat(summary.tasteTraits().structure()).containsExactly(new TraitScore("ACIDITY", 85, 0, false),
                new TraitScore("BODY", 55, 0, false), new TraitScore("TANNIN", 60, 0, false),
                new TraitScore("SWEETNESS", 60, 0, false));
        // OAK 1, FRUIT 1, SPICE 1, FLORAL 2 of 5
        assertThat(summary.tasteTraits().families()).containsExactly(new FamilyShare("FLORAL", 40),
                new FamilyShare("FRUIT", 20), new FamilyShare("OAK", 20), new FamilyShare("SPICE", 20));
        verify(social, never()).likedWines(any(), any(), any(Integer.class));
    }

    @Test
    void aRealTraitWinsAndTheMissingOnesComeFromTheQuiz() {
        tastes(5);
        completedQuiz();
        when(social.likedWines(member, TasteTraits.MIN_LIKED_RATING, TasteTraits.MAX_LIKED_WINES)).thenReturn(List.of(
                row("5", 10d, List.of(), false), row("5", 10d, List.of(), false), row("5", 10d, List.of(), false)));
        SocialProfileSummary summary = handler.profile(null, member);
        assertThat(summary.tasteTraits().fromQuiz()).isTrue();
        assertThat(summary.tasteTraits().structure()).containsExactly(new TraitScore("ACIDITY", 10, 3, false),
                new TraitScore("BODY", 55, 0, false), new TraitScore("TANNIN", 60, 0, false),
                new TraitScore("SWEETNESS", 60, 0, false));
        assertThat(summary.tasteTraits().families()).first().isEqualTo(new FamilyShare("FLORAL", 40));
    }

    @Test
    void aSkippedQuizLeavesTheTasteTraitsAsTheyWere() {
        tastes(2);
        when(quizzes.find(member)).thenReturn(Optional.of(new StoredTasteQuiz(TasteQuizStatus.SKIPPED, null)));
        assertThat(handler.profile(null, member).tasteTraits()).isNull();
    }

    @Test
    void manualValuesWinForTheirTraitsAndAloneStillShowTheTasteTraits() {
        tastes(2);
        when(adjustments.find(member)).thenReturn(Map.of(TasteTrait.SWEETNESS, 70));
        SocialProfileSummary alone = handler.profile(null, member);
        assertThat(alone.tasteWheel()).isNull();
        assertThat(alone.tasteTraits().structure()).containsExactly(new TraitScore("SWEETNESS", 70, 0, true));
        assertThat(alone.tasteTraits().families()).isEmpty();
        assertThat(alone.tasteTraits().fromQuiz()).isFalse();

        completedQuiz();
        when(adjustments.find(member)).thenReturn(Map.of(TasteTrait.ACIDITY, 20));
        SocialProfileSummary seeded = handler.profile(null, member);
        assertThat(seeded.tasteTraits().structure()).containsExactly(new TraitScore("ACIDITY", 20, 0, true),
                new TraitScore("BODY", 55, 0, false), new TraitScore("TANNIN", 60, 0, false),
                new TraitScore("SWEETNESS", 60, 0, false));
        assertThat(seeded.tasteTraits().fromQuiz()).isTrue();
    }

    private void completedQuiz() {
        when(quizzes.find(member)).thenReturn(Optional.of(new StoredTasteQuiz(TasteQuizStatus.COMPLETED,
                TasteQuiz.of(Map.of("RAINY_DAY", "DARK_CHOCOLATE_COFFEE", "FRUIT", "CITRUS", "DESSERT", "LEMON_TART",
                        "DINNER", "SPICY_CURRY", "AROMA", "ROSES_VIOLETS")))));
    }

    private void tastes(int ratedWines) {
        when(social.tastes(anyCollection())).thenReturn(Map.of(member,
                List.of(new TasteScore(Kind.TYPE, "RED", "RED", new BigDecimal("4.00"), ratedWines))));
    }

    private static LikedWineRow row(String rating, double acidity, List<String> descriptors, boolean profiled) {
        return new LikedWineRow(new BigDecimal(rating), Map.of(TasteTrait.ACIDITY, acidity), Map.of(), profiled,
                descriptors);
    }
}
