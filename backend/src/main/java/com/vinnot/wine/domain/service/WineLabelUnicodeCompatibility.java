package com.vinnot.wine.domain.service;

/**
 * Unicode letters that do not decompose through {@link java.text.Normalizer}.
 * This is a script compatibility table, not a wine-name exception list.
 */
enum WineLabelUnicodeCompatibility {

    AE("æ", "ae"),
    OE("œ", "oe"),
    SHARP_S("ß", "ss"),
    O_STROKE("ø", "o"),
    L_STROKE("ł", "l"),
    D_STROKE("đ", "d"),
    ETH("ð", "d"),
    THORN("þ", "th"),
    H_STROKE("ħ", "h"),
    DOTLESS_I("ı", "i");

    private final String source;
    private final String replacement;

    WineLabelUnicodeCompatibility(String source, String replacement) {
        this.source = source;
        this.replacement = replacement;
    }

    static String transliterate(String value) {
        String result = value;
        for (WineLabelUnicodeCompatibility compatibility : values()) {
            result = result
                    .replace(compatibility.source, compatibility.replacement)
                    .replace(compatibility.source.toUpperCase(),
                            compatibility.replacement.toUpperCase());
        }
        return result;
    }
}
