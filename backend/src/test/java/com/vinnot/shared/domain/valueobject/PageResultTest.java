package com.vinnot.shared.domain.valueobject;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PageResultTest {

    @Test
    void calculatesPageCountAndMapsContentWithoutChangingMetadata() {
        PageResult<Integer> page = PageResult.of(List.of(1, 2), 1, 2, 5);
        PageResult<String> mapped = page.map(Object::toString);

        assertThat(page.totalPages()).isEqualTo(3);
        assertThat(mapped.content()).containsExactly("1", "2");
        assertThat(mapped.page()).isEqualTo(1);
        assertThat(mapped.totalElements()).isEqualTo(5);
        assertThat(mapped.hasContent()).isTrue();
    }

    @Test
    void representsEmptyAndUnpagedResultsSafely() {
        assertThat(PageResult.empty().isEmpty()).isTrue();
        assertThat(PageResult.of(List.of(), 0, 0, 10).totalPages()).isZero();
        assertThat(new PageResult<>(null, 0, 10, 0, 0).isEmpty()).isTrue();
    }
}
