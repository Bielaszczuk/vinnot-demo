package com.vinnot.shared.infrastructure.web.dto;

import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Wrapper for Spring Data {@link Page} to match the frontend pagination contract.
 * Frontend expects: items, content, pageNumber, pageSize, totalItems, totalPages,
 * first, last, hasNext, hasPrevious.
 *
 * @param <T> the page element type
 */
public record PageResponseWrapper<T>(
        List<T> items,
        List<T> content,
        int pageNumber,
        int pageSize,
        long totalItems,
        int totalPages,
        boolean first,
        boolean last,
        boolean hasNext,
        boolean hasPrevious,
        boolean empty
) {

    /**
     * Creates a PageResponseWrapper from a Spring Data Page.
     *
     * @param page the Spring Data page
     * @param <T>  the element type
     * @return the wrapper matching frontend contract
     */
    public static <T> PageResponseWrapper<T> from(Page<T> page) {
        return new PageResponseWrapper<>(
                page.getContent(),
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast(),
                page.hasNext(),
                page.hasPrevious(),
                page.isEmpty()
        );
    }

    /**
     * Creates a PageResponseWrapper from a domain PageResult.
     *
     * @param result the domain page result
     * @param <T>    the element type
     * @return the wrapper matching frontend contract
     */
    public static <T> PageResponseWrapper<T> from(PageResult<T> result) {
        boolean isFirst = result.page() == 0;
        boolean isLast = result.page() >= result.totalPages() - 1;
        return new PageResponseWrapper<>(
                result.content(),
                result.content(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages(),
                isFirst,
                isLast,
                !isLast,
                !isFirst,
                result.content().isEmpty()
        );
    }
}

