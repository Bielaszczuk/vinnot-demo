package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostLanguageException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #497 S7, S9: a post is written in es and en; any other language code is invalid. */
class PostLanguageTest {

    @Test
    void theCodesAreEsAndEnAndAnythingElseIsInvalid() {
        assertThat(PostLanguage.fromCode("es")).isEqualTo(PostLanguage.ES);
        assertThat(PostLanguage.fromCode("en")).isEqualTo(PostLanguage.EN);
        assertThatThrownBy(() -> PostLanguage.fromCode("fr")).isInstanceOf(InvalidPostLanguageException.class)
                .hasMessageContaining("es, en");
        assertThatThrownBy(() -> PostLanguage.fromCode("ES")).isInstanceOf(InvalidPostLanguageException.class);
        assertThatThrownBy(() -> PostLanguage.fromCode(null)).isInstanceOf(InvalidPostLanguageException.class)
                .hasMessageContaining("required");
        assertThat(new InvalidPostLanguageException("x").getCode()).isEqualTo(InvalidPostLanguageException.CODE);
    }
}
