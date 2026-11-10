package com.vinnot.shared.domain.valueobject;

import java.util.List;
import java.util.Objects;
import java.util.function.Function;

/**
 * Domain abstraction for paginated results.
 * Replaces {@code org.springframework.data.domain.Page} in domain ports.
 *
 * @param <T> the content type
 */
public record PageResult<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    public static <T> PageResult<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
        return new PageResult<>(content, page, size, totalElements, totalPages);
    }

    /**
     * Maps the content of this page to a different type.
     *
     * @param mapper the mapping function
     * @param <R>    the target type
     * @return a new PageResult with mapped content
     */
    public <R> PageResult<R> map(Function<T, R> mapper) {
        List<R> mappedContent = content.stream().map(mapper).toList();
        return new PageResult<>(mappedContent, page, size, totalElements, totalPages);
    }

    public boolean hasContent() {
        return Objects.nonNull(content) && !content.isEmpty();
    }

    public boolean isEmpty() {
        return Objects.isNull(content) || content.isEmpty();
    }

    public static <T> PageResult<T> empty() {
        return new PageResult<>(List.of(), 0, 0, 0, 0);
    }
}

