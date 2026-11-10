package com.vinnot.ai.domain.valueobject;

import java.util.Locale;
import java.util.Objects;

/** Languages currently generated and persisted for AI-authored content. */
public enum AiContentLanguage {
    SPANISH("es"),
    ENGLISH("en");

    private final String code;

    AiContentLanguage(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    /** Resolves regional locale tags to the canonical persistence language. */
    public static AiContentLanguage from(String language) {
        if (Objects.nonNull(language)
                && language.toLowerCase(Locale.ROOT).startsWith(ENGLISH.code)) {
            return ENGLISH;
        }
        return SPANISH;
    }
}
