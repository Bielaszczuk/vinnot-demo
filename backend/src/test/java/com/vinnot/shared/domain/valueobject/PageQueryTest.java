package com.vinnot.shared.domain.valueobject;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PageQueryTest {

    @Test
    void rejectsUnboundedOrOverflowingRequestsWithoutClampingValidResults() {
        for (int[] values : new int[][] {
                {-1, 20}, {0, 0}, {0, -1}, {0, 201},
                {Integer.MAX_VALUE, 20}, {Integer.MAX_VALUE, 1}}) {
            assertThatThrownBy(() -> PageQuery.of(values[0], values[1]))
                    .isInstanceOf(BusinessRuleViolationException.class)
                    .extracting("code").isEqualTo("INVALID_PAGINATION");
        }
        assertThat(PageQuery.of(0, 200).size()).isEqualTo(200);
        assertThat(PageQuery.of(Integer.MAX_VALUE - 1, 1).page())
                .isEqualTo(Integer.MAX_VALUE - 1);
    }

    @Test
    void createsSimpleAndSortedQueries() {
        PageQuery simple = PageQuery.of(2, 25);
        PageQuery sorted = PageQuery.of(
                0, 10, "createdAt", PageQuery.SortDirection.DESC);

        assertThat(simple).isEqualTo(new PageQuery(2, 25, null, null));
        assertThat(sorted.sortBy()).isEqualTo("createdAt");
        assertThat(sorted.sortDirection()).isEqualTo(PageQuery.SortDirection.DESC);
    }
}
