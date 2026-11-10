package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.domain.model.Review;
import com.vinnot.review.infrastructure.persistence.entity.ReviewJpaEntity;
import com.vinnot.review.infrastructure.persistence.jpa.ReviewJpaRepository;
import com.vinnot.review.infrastructure.persistence.mapper.ReviewPersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ReviewPersistenceAdapter implements ReviewRepositoryPort {

    private final ReviewJpaRepository jpaRepository;
    private final ReviewPersistenceMapper mapper;

    @Override
    public Optional<UUID> findWineId(UUID id) {
        return jpaRepository.findWineId(id);
    }

    @Override
    public Optional<Review> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Review> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public PageResult<Review> findByWineId(UUID wineId, PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findByWineIdOrderByCreatedAtDesc(wineId, PageMapper.toPageable(pageQuery))
                        .map(mapper::toDomain));
    }

    @Override
    public PageResult<Review> findVisibleByWineId(UUID wineId, UUID viewerId, PageQuery pageQuery) {
        return PageMapper.toPageResult(jpaRepository.findVisibleByWineId(wineId, viewerId, PageMapper.toPageable(pageQuery)).map(mapper::toDomain));
    }

    @Override
    public boolean isInteractionBlocked(UUID reviewId, UUID viewerId) {
        return jpaRepository.isInteractionBlocked(reviewId, viewerId);
    }

    @Override
    public List<Review> findByUserId(UUID userId) {
        return jpaRepository.findByUserId(userId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Map<UUID, Long> countByUserIds(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return jpaRepository.countGroupedByUserId(userIds).stream()
                .collect(Collectors.toMap(
                        ReviewJpaRepository.IdCountProjection::getId,
                        ReviewJpaRepository.IdCountProjection::getTotal));
    }

    @Override
    public Optional<Review> findByWineIdAndUserId(UUID wineId, UUID userId) {
        return jpaRepository.findByWineIdAndUserId(wineId, userId)
                .map(mapper::toDomain);
    }

    @Override
    public Map<UUID, UUID> findIdsByUserIdAndWineIds(UUID userId, Collection<UUID> wineIds) {
        if (wineIds.isEmpty()) {
            return Map.of();
        }
        return jpaRepository.findIdsByUserIdAndWineIds(userId, wineIds).stream()
                .collect(Collectors.toMap(
                        ReviewJpaRepository.WineReviewIdProjection::getWineId,
                        ReviewJpaRepository.WineReviewIdProjection::getReviewId));
    }

    @Override
    public Review save(Review review) {
        ReviewJpaEntity entity = mapper.toEntity(review);
        ReviewJpaEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public void delete(Review review) {
        jpaRepository.deleteById(review.getId());
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public boolean existsByWineIdAndUserId(UUID wineId, UUID userId) {
        return jpaRepository.existsByWineIdAndUserId(wineId, userId);
    }

    @Override
    public long countByWineId(UUID wineId) {
        return jpaRepository.countByWineId(wineId);
    }

    @Override
    public double getAverageRatingByWineId(UUID wineId) {
        Double avg = jpaRepository.getAverageRatingByWineId(wineId);
        return Objects.nonNull(avg) ? avg : 0.0;
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public PageResult<Review> findAll(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findAll(PageMapper.toPageable(pageQuery)).map(mapper::toDomain));
    }

    @Override
    public PageResult<Review> searchByKeyword(String keyword, PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.searchByKeyword(keyword, PageMapper.toPageable(pageQuery))
                        .map(mapper::toDomain));
    }
}
