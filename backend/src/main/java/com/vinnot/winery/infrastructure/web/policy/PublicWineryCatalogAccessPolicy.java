package com.vinnot.winery.infrastructure.web.policy;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Component;

/**
 * Limits how many wineries the public listing exposes, matching the public wine
 * catalog window (#431). Admin listings use their own endpoint and are not capped here.
 */
@Component
public class PublicWineryCatalogAccessPolicy {

    static final int MAX_PAGE_SIZE = 20;
    static final int MAX_RESULT_WINDOW = 500;

    /**
     * Validates pagination and caps the requested page size.
     *
     * @param page requested zero-based page
     * @param requestedSize requested page size
     * @return pagination accepted by the public listing
     */
    public Pagination resolvePagination(int page, int requestedSize) {
        if (page < 0) {
            throw new DomainException("INVALID_PAGE", "Page must be greater than or equal to zero");
        }
        if (requestedSize <= 0) {
            throw new DomainException("INVALID_PAGE_SIZE", "Page size must be greater than zero");
        }
        int size = Math.min(requestedSize, MAX_PAGE_SIZE);
        if ((long) page * size >= MAX_RESULT_WINDOW) {
            throw new DomainException(
                    "PUBLIC_CATALOG_WINDOW_EXCEEDED",
                    "The public winery listing exposes up to 500 results per search");
        }
        return new Pagination(page, size);
    }

    /**
     * Keeps pagination metadata from advertising pages outside the window.
     *
     * @param result repository-backed page result
     * @param <T> page item type
     * @return page with public result-window metadata
     */
    public <T> PageResult<T> constrain(PageResult<T> result) {
        long offset = (long) result.page() * result.size();
        long remainingItems = Math.max(0, MAX_RESULT_WINDOW - offset);
        return PageResult.of(
                result.content().stream().limit(remainingItems).toList(),
                result.page(),
                result.size(),
                Math.min(result.totalElements(), MAX_RESULT_WINDOW));
    }

    public record Pagination(int page, int size) {
    }
}
