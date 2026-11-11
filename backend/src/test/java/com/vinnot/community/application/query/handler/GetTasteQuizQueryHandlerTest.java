package com.vinnot.community.application.query.handler;

import com.vinnot.community.application.port.out.SocialQueryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort.StoredTasteQuiz;
import com.vinnot.community.application.query.response.TasteQuizResponse;
import com.vinnot.community.domain.model.TasteQuiz;
import com.vinnot.community.domain.model.TasteQuizStatus;
import com.vinnot.community.domain.model.TasteScore;
import com.vinnot.community.domain.model.TasteScore.Kind;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** #541 S10: the own quiz status, its answers for the owner, and whether to prompt a newcomer. */
class GetTasteQuizQueryHandlerTest {
    private final UUID member = UUID.randomUUID();
    private final TasteQuizRepositoryPort quizzes = mock(TasteQuizRepositoryPort.class);
    private final SocialQueryPort social = mock(SocialQueryPort.class);
    private final GetTasteQuizQueryHandler handler = new GetTasteQuizQueryHandler(quizzes, social);

    @Test
    void aMemberWithoutAQuizIsPendingAndPromptedWhileTheyRatedFewerThanFiveWines() {
        rated(3, 1);
        TasteQuizResponse response = handler.execute(member);
        assertThat(response).isEqualTo(new TasteQuizResponse("PENDING", null, true));
    }

    @Test
    void aPendingMemberWithFiveRatedWinesIsNotPrompted() {
        rated(4, 1);
        assertThat(handler.execute(member)).isEqualTo(new TasteQuizResponse("PENDING", null, false));
    }

    @Test
    void aCompletedQuizReturnsItsAnswersInQuizOrderAndIsNotPrompted() {
        rated(0, 0);
        when(quizzes.find(member)).thenReturn(Optional.of(new StoredTasteQuiz(TasteQuizStatus.COMPLETED,
                TasteQuiz.of(Map.of("AROMA", "CUT_GRASS", "DINNER", "LEMON_FISH", "DESSERT", "FRESH_FRUIT",
                        "FRUIT", "CITRUS", "RAINY_DAY", "SPICED_TEA_APPLE_TART")))));
        TasteQuizResponse response = handler.execute(member);
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.shouldPrompt()).isFalse();
        assertThat(new ArrayList<>(response.answers().keySet()))
                .containsExactly("RAINY_DAY", "FRUIT", "DESSERT", "DINNER", "AROMA");
        assertThat(response.answers()).containsEntry("RAINY_DAY", "SPICED_TEA_APPLE_TART")
                .containsEntry("AROMA", "CUT_GRASS");
    }

    @Test
    void aSkippedQuizHasNoAnswersAndIsNotPrompted() {
        rated(0, 0);
        when(quizzes.find(member)).thenReturn(Optional.of(new StoredTasteQuiz(TasteQuizStatus.SKIPPED, null)));
        assertThat(handler.execute(member)).isEqualTo(new TasteQuizResponse("SKIPPED", null, false));
    }

    /** Rated wines are the sum of the type rows, like the profile's wheel threshold. */
    private void rated(int reds, int whites) {
        when(quizzes.find(member)).thenReturn(Optional.empty());
        List<TasteScore> scores = List.of(
                new TasteScore(Kind.TYPE, "RED", "RED", new BigDecimal("4.00"), reds),
                new TasteScore(Kind.TYPE, "WHITE", "WHITE", new BigDecimal("4.00"), whites),
                new TasteScore(Kind.GRAPE, "malbec", "Malbec", new BigDecimal("4.00"), 9));
        when(social.tastes(List.of(member))).thenReturn(Map.of(member, scores));
    }
}
