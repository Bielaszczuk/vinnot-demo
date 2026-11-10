package com.vinnot.shared.application.util;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SearchInputLimitsTest {
    @Test
    void preservesNullEmptyUnicodeAndPartialTermsWithinTheLimit() {
        assertThatCode(() -> SearchInputLimits.text(null, "", "  Bousquet  ", "á".repeat(512)))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> SearchInputLimits.text("a".repeat(513)))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("INVALID_SEARCH");
    }

    @Test
    void acceptsOnlyDeclaredSortOptionsWithoutChangingTheirCaseOrDefault() {
        for (String value : new String[]{null, "", " ", "DESC", "asc"}) {
            assertThatCode(() -> SearchInputLimits.option(value, Set.of("asc", "desc"))).doesNotThrowAnyException();
        }
        assertThatThrownBy(() -> SearchInputLimits.option("id;drop", Set.of("asc", "desc")))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void querySpecificBoundsRetainSharedOffsetSafety() {
        assertThat(PageQuery.bounded(0, 100, 100)).isEqualTo(PageQuery.of(0, 100));
        assertThatThrownBy(() -> PageQuery.bounded(0, 101, 100))
                .isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> PageQuery.bounded(Integer.MAX_VALUE, 100, 100))
                .isInstanceOf(BusinessRuleViolationException.class);
    }
}
