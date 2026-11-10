package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.infrastructure.persistence.entity.ReviewCommentJpaEntity;
import com.vinnot.review.infrastructure.persistence.jpa.ReviewCommentJpaRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ReviewCommentPersistenceAdapter implements ReviewCommentRepositoryPort {

    private final ReviewCommentJpaRepository jpaRepository;

    @Override
    public Optional<ReviewCommentData> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toData);
    }

    @Override
    public List<ReviewCommentData> findByReviewIdOrderByCreatedAtAsc(UUID reviewId) {
        return jpaRepository.findByReviewIdOrderByCreatedAtAsc(reviewId).stream()
                .map(this::toData)
                .toList();
    }

    @Override
    public List<ReviewCommentData> findVisibleByReviewId(UUID reviewId, UUID viewerId) {
        return jpaRepository.findVisibleByReviewId(reviewId, viewerId).stream().map(this::toData).toList();
    }

    @Override
    public long countByReviewId(UUID reviewId) {
        return jpaRepository.countByReviewId(reviewId);
    }

    @Override
    public Map<UUID, Long> countByReviewIds(Collection<UUID> reviewIds) {
        if (reviewIds.isEmpty()) {
            return Map.of();
        }
        return jpaRepository.countGroupedByReviewId(reviewIds).stream()
                .collect(Collectors.toMap(
                        ReviewCommentJpaRepository.IdCountProjection::getId,
                        ReviewCommentJpaRepository.IdCountProjection::getTotal));
    }

    @Override
    public UUID save(UUID reviewId, UUID userId, String content, PublicationStatus status) {
        Instant now = Instant.now();
        ReviewCommentJpaEntity entity = new ReviewCommentJpaEntity();
        entity.setId(UUID.randomUUID());
        entity.setReviewId(reviewId);
        entity.setUserId(userId);
        entity.setContent(content);
        entity.setPublicationStatus(status);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        jpaRepository.save(entity);
        return entity.getId();
    }

    @Override
    public void delete(UUID commentId) {
        jpaRepository.deleteById(commentId);
    }

    private ReviewCommentData toData(ReviewCommentJpaEntity entity) {
        return new ReviewCommentData(
                entity.getId(),
                entity.getReviewId(),
                entity.getUserId(),
                entity.getContent(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getPublicationStatus()
        );
    }
}
