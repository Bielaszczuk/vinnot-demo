package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.CompleteTasteQuizCommand;
import com.vinnot.community.application.port.in.CompleteTasteQuizUseCase;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.domain.model.TasteQuiz;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Validates every answer before storing the quiz as completed (#541); a retake overwrites the previous answers. */
@Service
@RequiredArgsConstructor
public class CompleteTasteQuizCommandHandler implements CompleteTasteQuizUseCase {
    private final TasteQuizRepositoryPort quizzes;

    @Override
    @Transactional
    public void execute(CompleteTasteQuizCommand command) {
        quizzes.saveCompleted(command.userId(), TasteQuiz.of(command.answers()));
    }
}
