package com.vinnot.shared.domain.valueobject;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

/**
 * Domain abstraction for pagination requests.
 * Replaces {@code org.springframework.data.domain.Pageable} in domain ports.
 *
 * @param page   zero-based page index
 * @param size   the page size
 * @param sortBy the field to sort by (nullable)
 * @param sortDirection the sort direction (nullable, defaults to ASC)
 */
public record PageQuery(
        int page,
        int size,
        String sortBy,
        SortDirection sortDirection
) {

    /** Safety ceiling; individual use cases may impose stricter limits. */
    public static final int MAX_SIZE = 200;

    public PageQuery {
        if (page < 0 || size < 1 || size > MAX_SIZE
                || (long) page * size > Integer.MAX_VALUE - (long) size) {
            throw new BusinessRuleViolationException("INVALID_PAGINATION",
                    "Page must be non-negative, size between 1 and 200, and offset within range");
        }
    }

    public enum SortDirection {
        ASC, DESC
    }

    public static PageQuery of(int page, int size) {
        return new PageQuery(page, size, null, null);
    }

    public static PageQuery bounded(int page, int size, int maximumSize) {
        if (size > maximumSize) {
            throw new BusinessRuleViolationException("INVALID_PAGINATION",
                    "Page size exceeds the limit for this query");
        }
        return of(page, size);
    }

    public static PageQuery of(int page, int size, String sortBy, SortDirection direction) {
        return new PageQuery(page, size, sortBy, direction);
    }
}
