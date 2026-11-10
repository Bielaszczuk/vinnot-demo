package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostLanguageException;

import java.util.Arrays;
import java.util.Objects;

/**
 * The languages every post is written in (#497): neutral Spanish and English, each with its own legal line. The code is
 * the key of the copy, of the slide set and of the storage folder of that language.
 */
public enum PostLanguage {
    ES("es", "Beber con moderación. Prohibida su venta a menores de 18 años."),
    EN("en", "Drink responsibly. Not for sale to anyone under 18.");

    private final String code;
    private final String legalLine;

    PostLanguage(String code, String legalLine) {
        this.code = code;
        this.legalLine = legalLine;
    }

    public String code() {
        return code;
    }

    /** The legal line the domain appends to every caption in this language and the renderer draws on the closing card. */
    public String legalLine() {
        return legalLine;
    }

    /** The language of a code ({@code es} or {@code en}); any other value, or none, is invalid. */
    public static PostLanguage fromCode(String code) {
        return Arrays.stream(values()).filter(language -> language.code.equals(code)).findFirst()
                .orElseThrow(() -> new InvalidPostLanguageException(Objects.isNull(code) ? "language is required"
                        : "language must be one of es, en"));
    }
}
