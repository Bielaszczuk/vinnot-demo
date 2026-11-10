package com.vinnot.wine.domain.service;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Symbols that can be part of a commercial wine identity. The stable token is
 * intentionally different from normal words so punctuation can disambiguate
 * catalog variants without distorting ordinary lexical similarity.
 */
enum WineLabelIdentitySymbol {

    PLUS("\\+", "plus", "__symbol_plus__"),
    HASH("#", "hash", "__symbol_hash__"),
    PERCENT("%", "percent", "__symbol_percent__"),
    AT("@", "at", "__symbol_at__"),
    STAR("\\*", "star", "__symbol_star__"),
    EXCLAMATION("!", "exclamation", "__symbol_exclamation__"),
    MULTIPLICATION(
            "(?:×|(?<=\\d)x(?=\\d)|(?<![\\p{L}\\p{N}])x(?![\\p{L}\\p{N}]))",
            "x",
            "__symbol_multiplication__");

    private final Pattern pattern;
    private final String semanticToken;
    private final String token;

    WineLabelIdentitySymbol(String pattern, String semanticToken, String token) {
        this.pattern = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE
                | Pattern.UNICODE_CASE);
        this.semanticToken = semanticToken;
        this.token = token;
    }

    static Set<String> tokens(String value) {
        Set<String> tokens = new LinkedHashSet<>();
        if (Objects.isNull(value) || value.isBlank()) {
            return tokens;
        }
        for (WineLabelIdentitySymbol identitySymbol : values()) {
            if (identitySymbol.pattern.matcher(value).find()) {
                tokens.add(identitySymbol.semanticToken);
                tokens.add(identitySymbol.token);
            }
        }
        return tokens;
    }

    static Set<String> discriminatorTokens(String value) {
        Set<String> tokens = new LinkedHashSet<>();
        if (Objects.isNull(value) || value.isBlank()) {
            return tokens;
        }
        for (WineLabelIdentitySymbol identitySymbol : values()) {
            if (identitySymbol.pattern.matcher(value).find()) {
                tokens.add(identitySymbol.token);
            }
        }
        return tokens;
    }
}
