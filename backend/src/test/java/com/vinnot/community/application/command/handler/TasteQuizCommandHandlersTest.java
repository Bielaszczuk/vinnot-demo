package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.CompleteTasteQuizCommand;
import com.vinnot.community.application.command.model.SkipTasteQuizCommand;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.domain.exception.InvalidTasteQuizException;
import com.vinnot.community.domain.model.TasteQuiz;
import com.vinnot.community.domain.model.TasteQuizAnswer;
import com.vinnot.community.domain.model.TasteQuizQuestion;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** #541 S10: completing the taste quiz stores validated answers (a retake overwrites); skipping never erases it. */
class TasteQuizCommandHandlersTest {
    private static final Map<String, String> ANSWERS = Map.of("RAINY_DAY", "DARK_CHOCOLATE_COFFEE",
            "FRUIT", "CITRUS", "DESSERT", "LEMON_TART", "DINNER", "SPICY_CURRY", "AROMA", "ROSES_VIOLETS");
    private final UUID member = UUID.randomUUID();
    private final TasteQuizRepositoryPort quizzes = mock(TasteQuizRepositoryPort.class);

    @Test
    void completingStoresTheValidatedAnswers() {
        new CompleteTasteQuizCommandHandler(quizzes).execute(new CompleteTasteQuizCommand(member, ANSWERS));

        ArgumentCaptor<TasteQuiz> quiz = ArgumentCaptor.forClass(TasteQuiz.class);
        verify(quizzes).saveCompleted(eq(member), quiz.capture());
        assertThat(quiz.getValue().answers()).containsEntry(TasteQuizQuestion.FRUIT, TasteQuizAnswer.CITRUS)
                .containsEntry(TasteQuizQuestion.AROMA, TasteQuizAnswer.ROSES_VIOLETS).hasSize(5);
    }

    @Test
    void invalidAnswersAreRejectedBeforeAnythingIsStored() {
        assertThatThrownBy(() -> new CompleteTasteQuizCommandHandler(quizzes).execute(
                new CompleteTasteQuizCommand(member, Map.of("FRUIT", "CITRUS"))))
                .isInstanceOf(InvalidTasteQuizException.class);
        verifyNoInteractions(quizzes);
    }

    @Test
    void skippingOnlyRecordsASkipWhenTheMemberHasNoQuizYet() {
        new SkipTasteQuizCommandHandler(quizzes).execute(new SkipTasteQuizCommand(member));
        verify(quizzes).skipIfAbsent(member);
    }
}
