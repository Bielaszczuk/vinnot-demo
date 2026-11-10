package com.vinnot.wine.infrastructure.web.policy;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Component;

/**
 * Defines the amount of wine catalog data exposed through public HTTP routes.
 *
 * <p>This is an adapter-level access policy rather than a wine domain rule:
 * administrative use cases and internal repository ports are intentionally not
 * constrained by the public API window.</p>
 */
@Component
public class PublicWineCatalogAccessPolicy {

    static final int MAX_PAGE_SIZE = 20;
    static final int MAX_RESULT_WINDOW = 500;
    static final int MAX_SIMILAR_WINES = 10;

    /**
     * Validates pagination and caps the requested page size.
     *
     * @param page requested zero-based page
     * @param requestedSize requested page size
     * @return pagination accepted by the public catalog
     */
    public Pagination resolvePagination(int page, int requestedSize) {
        if (page < 0) {
            throw new DomainException(
                    "INVALID_PAGE",
                    "Page must be greater than or equal to zero");
        }
        if (requestedSize <= 0) {
            throw new DomainException(
                    "INVALID_PAGE_SIZE",
                    "Page size must be greater than zero");
        }

        int size = Math.min(requestedSize, MAX_PAGE_SIZE);
        long offset = (long) page * size;
        if (offset >= MAX_RESULT_WINDOW) {
            throw new DomainException(
                    "PUBLIC_CATALOG_WINDOW_EXCEEDED",
                    "The public wine catalog exposes up to 500 results per search");
        }
        return new Pagination(page, size);
    }

    /**
     * Prevents pagination metadata from advertising inaccessible public pages.
     *
     * @param result repository-backed page result
     * @param <T> page item type
     * @return page with public result-window metadata
     */
    public <T> PageResult<T> constrain(PageResult<T> result) {
        long offset = (long) result.page() * result.size();
        long remainingItems = Math.max(0, MAX_RESULT_WINDOW - offset);
        var exposedContent = result.content().stream()
                .limit(remainingItems)
                .toList();
        long exposedTotal = Math.min(result.totalElements(), MAX_RESULT_WINDOW);
        return PageResult.of(
                exposedContent,
                result.page(),
                result.size(),
                exposedTotal
        );
    }

    public int resolveSimilarLimit(int requestedLimit) {
        if (requestedLimit <= 0) {
            throw new DomainException(
                    "INVALID_RESULT_LIMIT",
                    "Result limit must be greater than zero");
        }
        return Math.min(requestedLimit, MAX_SIMILAR_WINES);
    }

    public record Pagination(int page, int size) {
    }
}
