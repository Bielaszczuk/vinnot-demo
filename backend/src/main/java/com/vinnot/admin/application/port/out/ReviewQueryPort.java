package com.vinnot.admin.application.port.out;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ReviewQueryPort {

    /**
     * Counts total reviews.
     *
     * @return the total count
     */
    long count();

    /**
     * Finds review data by ID.
     *
     * @param id the review ID
     * @return the review data if found
     */
    Optional<ReviewData> findById(UUID id);

    /**
     * Gets all reviews paginated.
     *
     * @param pageQuery pagination info
     * @return page of review data
     */
    PageResult<ReviewData> findAll(PageQuery pageQuery);

    /**
     * Searches reviews by keyword in title or comment.
     *
     * @param keyword   the search keyword
     * @param pageQuery pagination info
     * @return page of matching review data
     */
    PageResult<ReviewData> searchByKeyword(String keyword, PageQuery pageQuery);

    record ReviewData(
            UUID id,
            UUID wineId,
            UUID userId,
            BigDecimal rating,
            String title,
            String comment,
            boolean verified,
            int helpfulCount,
            int likesCount,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}
