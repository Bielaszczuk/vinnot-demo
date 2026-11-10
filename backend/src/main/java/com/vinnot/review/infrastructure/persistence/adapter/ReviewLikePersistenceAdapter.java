package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.infrastructure.persistence.entity.ReviewLikeJpaEntity;
import com.vinnot.review.infrastructure.persistence.jpa.ReviewLikeJpaRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ReviewLikePersistenceAdapter implements ReviewLikeRepositoryPort {

    private final ReviewLikeJpaRepository jpaRepository;

    @Override
    public boolean existsByReviewIdAndUserId(UUID reviewId, UUID userId) {
        return jpaRepository.existsByReviewIdAndUserId(reviewId, userId);
    }

    @Override
    public void save(UUID reviewId, UUID userId) {
        ReviewLikeJpaEntity entity = new ReviewLikeJpaEntity(
                UUID.randomUUID(), reviewId, userId, Instant.now());
        jpaRepository.save(entity);
    }

    @Override
    public void deleteByReviewIdAndUserId(UUID reviewId, UUID userId) {
        jpaRepository.deleteByReviewIdAndUserId(reviewId, userId);
    }

    @Override
    public long countByReviewId(UUID reviewId) {
        return jpaRepository.countByReviewId(reviewId);
    }

    @Override
    public List<UUID> findUserIdsByReviewId(UUID reviewId) {
        return jpaRepository.findUserIdsByReviewId(reviewId);
    }

    @Override
    public Set<UUID> findLikedReviewIdsByUserIdAndReviewIdIn(UUID userId, Collection<UUID> reviewIds) {
        return jpaRepository.findLikedReviewIdsByUserIdAndReviewIdIn(userId, reviewIds);
    }
}

