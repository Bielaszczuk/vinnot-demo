package com.vinnot.winery.infrastructure.web.policy;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PublicWineryCatalogAccessPolicyTest {

    private final PublicWineryCatalogAccessPolicy policy = new PublicWineryCatalogAccessPolicy();

    @Test
    void capsThePageSizeAtTwenty() {
        assertThat(policy.resolvePagination(0, 100))
                .isEqualTo(new PublicWineryCatalogAccessPolicy.Pagination(0, 20));
        assertThat(policy.resolvePagination(3, 10))
                .isEqualTo(new PublicWineryCatalogAccessPolicy.Pagination(3, 10));
    }

    @Test
    void rejectsPagesBeyondTheFiveHundredResultWindow() {
        assertThat(policy.resolvePagination(24, 20).page()).isEqualTo(24);
        assertThatThrownBy(() -> policy.resolvePagination(25, 20))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "PUBLIC_CATALOG_WINDOW_EXCEEDED");
        assertThatThrownBy(() -> policy.resolvePagination(25, 500))
                .hasFieldOrPropertyWithValue("code", "PUBLIC_CATALOG_WINDOW_EXCEEDED");
    }

    @Test
    void rejectsInvalidPagination() {
        assertThatThrownBy(() -> policy.resolvePagination(-1, 20))
                .hasFieldOrPropertyWithValue("code", "INVALID_PAGE");
        assertThatThrownBy(() -> policy.resolvePagination(0, 0))
                .hasFieldOrPropertyWithValue("code", "INVALID_PAGE_SIZE");
    }

    @Test
    void neverAdvertisesMoreThanFiveHundredResults() {
        List<Integer> page = IntStream.range(0, 20).boxed().toList();

        PageResult<Integer> constrained = policy.constrain(PageResult.of(page, 24, 20, 834));

        assertThat(constrained.totalElements()).isEqualTo(500);
        assertThat(constrained.content()).hasSize(20);
        assertThat(policy.constrain(PageResult.of(page, 0, 20, 12)).totalElements()).isEqualTo(12);
    }
}
