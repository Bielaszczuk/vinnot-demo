package com.vinnot.review.application.port.out;

import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface ReviewRepositoryPort {

    Optional<Review> findById(UUID id);

    Optional<Review> findByIdForUpdate(UUID id);

    Optional<UUID> findWineId(UUID id);

    PageResult<Review> findByWineId(UUID wineId, PageQuery pageQuery);

    PageResult<Review> findVisibleByWineId(UUID wineId, UUID viewerId, PageQuery pageQuery);

    boolean isInteractionBlocked(UUID reviewId, UUID viewerId);

    List<Review> findByUserId(UUID userId);

    /** Counts reviews for all requested users in one grouped query. */
    Map<UUID, Long> countByUserIds(Collection<UUID> userIds);

    Optional<Review> findByWineIdAndUserId(UUID wineId, UUID userId);

    Map<UUID, UUID> findIdsByUserIdAndWineIds(UUID userId, Collection<UUID> wineIds);

    Review save(Review review);

    void delete(Review review);

    boolean existsById(UUID id);

    boolean existsByWineIdAndUserId(UUID wineId, UUID userId);

    long countByWineId(UUID wineId);

    double getAverageRatingByWineId(UUID wineId);

    /**
     * Counts total reviews.
     *
     * @return the total count
     */
    long count();

    /**
     * Gets all reviews paginated.
     *
     * @param pageQuery pagination info
     * @return page of reviews
     */
    PageResult<Review> findAll(PageQuery pageQuery);

    /**
     * Searches reviews by keyword in title or comment.
     *
     * @param keyword   the search keyword
     * @param pageQuery pagination info
     * @return page of matching reviews
     */
    PageResult<Review> searchByKeyword(String keyword, PageQuery pageQuery);
}
