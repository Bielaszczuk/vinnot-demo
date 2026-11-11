package com.vinnot.community.application.query.handler;

import com.vinnot.community.application.port.in.GetTasteQuizUseCase;
import com.vinnot.community.application.port.out.SocialQueryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort;
import com.vinnot.community.application.port.out.TasteQuizRepositoryPort.StoredTasteQuiz;
import com.vinnot.community.application.query.response.TasteQuizResponse;
import com.vinnot.community.domain.model.TasteProfile;
import com.vinnot.community.domain.model.TasteQuiz;
import com.vinnot.community.domain.model.TasteQuizStatus;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The member's own taste quiz (#541). A member who never answered it is prompted while they rated fewer wines than the
 * profile needs for its wheel ({@link TasteProfile#MIN_RATED_WINES}), counted the same way: the sum of the type rows.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetTasteQuizQueryHandler implements GetTasteQuizUseCase {
    private final TasteQuizRepositoryPort quizzes;
    private final SocialQueryPort social;

    @Override
    public TasteQuizResponse execute(UUID userId) {
        Optional<StoredTasteQuiz> stored = quizzes.find(userId);
        if (stored.isPresent()) {
            return new TasteQuizResponse(stored.get().status().name(),
                    stored.get().completed().map(TasteQuiz::keys).orElse(null), false);
        }
        TasteProfile taste = TasteProfile.of(social.tastes(List.of(userId)).getOrDefault(userId, List.of()));
        return new TasteQuizResponse(TasteQuizStatus.PENDING.name(), null, !taste.isShareable());
    }
}
