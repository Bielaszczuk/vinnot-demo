package com.vinnot.shared.infrastructure.persistence;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Objects;

public final class PageMapper {

    private PageMapper() {
    }

    /**
     * Converts a domain {@link PageQuery} to a Spring Data {@link Pageable}.
     */
    public static Pageable toPageable(PageQuery query) {
        if (Objects.nonNull(query.sortBy()) && !query.sortBy().isBlank()) {
            Sort.Direction direction = query.sortDirection() == PageQuery.SortDirection.DESC
                    ? Sort.Direction.DESC : Sort.Direction.ASC;
            return PageRequest.of(query.page(), query.size(), Sort.by(direction, query.sortBy()));
        }
        return PageRequest.of(query.page(), query.size());
    }

    /**
     * Converts a Spring Data {@link Page} to a domain {@link PageResult}.
     */
    public static <T> PageResult<T> toPageResult(Page<T> page) {
        return PageResult.of(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements()
        );
    }
}

