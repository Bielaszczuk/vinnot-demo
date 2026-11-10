package com.vinnot.review.application.query.handler;

import com.vinnot.review.application.port.in.CheckUserReviewUseCase;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CheckUserReviewQueryHandler implements CheckUserReviewUseCase {

    private final ReviewRepositoryPort reviewRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean execute(UUID wineId, UUID userId) {
        return reviewRepository.existsByWineIdAndUserId(wineId, userId);
    }
}

