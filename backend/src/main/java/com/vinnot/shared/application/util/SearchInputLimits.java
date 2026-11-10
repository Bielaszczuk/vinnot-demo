package com.vinnot.shared.application.util;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/** Query-input bounds applied before persistence; does not rewrite accepted search terms. */
public final class SearchInputLimits {
    private static final int MAX_SEARCH_LENGTH = 512;

    private SearchInputLimits() { }

    public static void text(String... values) {
        for (String value : values) {
            if (Objects.nonNull(value) && value.length() > MAX_SEARCH_LENGTH) {
                throw new BusinessRuleViolationException("INVALID_SEARCH",
                        "Search fields must contain at most 512 characters");
            }
        }
    }

    public static void option(String value, Set<String> accepted) {
        if (Objects.nonNull(value) && !value.isBlank() && !accepted.contains(value.toLowerCase(Locale.ROOT))) {
            throw new BusinessRuleViolationException("INVALID_SEARCH_OPTION", "Unsupported search option");
        }
    }
}
