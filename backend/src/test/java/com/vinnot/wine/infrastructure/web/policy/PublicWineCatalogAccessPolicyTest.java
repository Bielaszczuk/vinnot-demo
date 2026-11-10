package com.vinnot.wine.infrastructure.web.policy;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PublicWineCatalogAccessPolicyTest {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int OVERSIZED_PAGE = 100;
    private static final int LAST_PUBLIC_PAGE = 24;
    private static final int FIRST_PRIVATE_PAGE = 25;

    private final PublicWineCatalogAccessPolicy policy =
            new PublicWineCatalogAccessPolicy();

    @Test
    void capsPageSizeWithoutChangingTheRequestedPage() {
        PublicWineCatalogAccessPolicy.Pagination pagination =
                policy.resolvePagination(2, OVERSIZED_PAGE);

        assertThat(pagination.page()).isEqualTo(2);
        assertThat(pagination.size()).isEqualTo(DEFAULT_PAGE_SIZE);
    }

    @Test
    void acceptsTheLastPageInsideThePublicResultWindow() {
        PublicWineCatalogAccessPolicy.Pagination pagination =
                policy.resolvePagination(LAST_PUBLIC_PAGE, DEFAULT_PAGE_SIZE);

        assertThat(pagination.page()).isEqualTo(LAST_PUBLIC_PAGE);
        assertThat(pagination.size()).isEqualTo(DEFAULT_PAGE_SIZE);
    }

    @Test
    void rejectsPagesOutsideThePublicResultWindow() {
        assertThatThrownBy(
                () -> policy.resolvePagination(FIRST_PRIVATE_PAGE, DEFAULT_PAGE_SIZE))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode())
                                .isEqualTo("PUBLIC_CATALOG_WINDOW_EXCEEDED"));
    }

    @Test
    void rejectsInvalidPaginationValues() {
        assertThatThrownBy(() -> policy.resolvePagination(-1, DEFAULT_PAGE_SIZE))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("INVALID_PAGE"));
        assertThatThrownBy(() -> policy.resolvePagination(0, 0))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("INVALID_PAGE_SIZE"));
    }

    @Test
    void capsPaginationMetadataAtThePublicResultWindow() {
        PageResult<String> source =
                PageResult.of(List.of("wine"), 0, DEFAULT_PAGE_SIZE, 8_000);

        PageResult<String> constrained = policy.constrain(source);

        assertThat(constrained.totalElements()).isEqualTo(500);
        assertThat(constrained.totalPages()).isEqualTo(25);
        assertThat(constrained.content()).containsExactly("wine");
    }

    @Test
    void trimsTheLastPageWhenItsSizeCrossesThePublicResultWindow() {
        PageResult<Integer> source = PageResult.of(
                IntStream.range(0, 19).boxed().toList(),
                26,
                19,
                8_000
        );

        PageResult<Integer> constrained = policy.constrain(source);

        assertThat(constrained.content()).containsExactly(0, 1, 2, 3, 4, 5);
        assertThat(constrained.totalElements()).isEqualTo(500);
        assertThat(constrained.totalPages()).isEqualTo(27);
    }

    @Test
    void capsSimilarWineResultsAndRejectsInvalidLimits() {
        assertThat(policy.resolveSimilarLimit(100)).isEqualTo(10);
        assertThat(policy.resolveSimilarLimit(5)).isEqualTo(5);
        assertThatThrownBy(() -> policy.resolveSimilarLimit(0))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("INVALID_RESULT_LIMIT"));
    }
}
