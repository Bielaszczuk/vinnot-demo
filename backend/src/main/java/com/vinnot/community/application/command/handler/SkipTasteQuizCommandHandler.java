package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.SkipTasteQuizCommand;
import com.vinnot.community.application.port.in.SkipTasteQuizUseCase;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Records a skip so the apps stop offering the quiz (#541); a completed quiz is never erased by a skip. */
@Service
@RequiredArgsConstructor
public class SkipTasteQuizCommandHandler implements SkipTasteQuizUseCase {
    private final TasteQuizRepositoryPort quizzes;

    @Override
    @Transactional
    public void execute(SkipTasteQuizCommand command) {
        quizzes.skipIfAbsent(command.userId());
    }
}
