package com.vinnot.cellar.infrastructure.persistence.adapter;

import com.vinnot.cellar.application.port.out.ReviewQueryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

@Component("cellarReviewQueryAdapter")
@RequiredArgsConstructor
public class ReviewQueryAdapter implements ReviewQueryPort {
    private final ReviewRepositoryPort reviews;

    @Override
    public Map<UUID, UUID> findReviewIds(UUID userId, Collection<UUID> wineIds) {
        return reviews.findIdsByUserIdAndWineIds(userId, wineIds);
    }
}
