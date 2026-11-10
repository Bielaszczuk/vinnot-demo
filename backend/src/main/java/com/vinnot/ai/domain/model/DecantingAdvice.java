package com.vinnot.ai.domain.model;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Whether a decanting line recommends decanting: it advises decanting or airing the wine ("Decantar 45 minutos",
 * "Sí, 30 minutos") and does not say it is unnecessary ("No requiere decantación").
 */
public final class DecantingAdvice {

    private static final Pattern ADVISED = TastingText.keywords("decant*", "airea*", "aerat*", "oxigen*", "oxygen*");
    /** The line answers the decanting question with a plain yes: "Sí, 30 minutos". */
    private static final Pattern AFFIRMED = Pattern.compile("^(si|yes)\\b\\s*[,.:;]");
    private static final Pattern NEGATED = TastingText.keywords("no requiere", "no necesita", "no es necesari*",
            "no hace falta", "innecesari*", "not necessary", "no need*", "unnecessary", "not required", "not needed",
            "no (decant|airea|aerat|oxigen)*", "sin (necesidad|decant)*", "do not decant*", "don'?t decant*");

    private DecantingAdvice() {
    }

    public static boolean recommends(String decanting) {
        if (Objects.isNull(decanting) || decanting.isBlank()) {
            return false;
        }
        String text = TastingText.normalized(decanting);
        boolean advised = ADVISED.matcher(text).find() || AFFIRMED.matcher(text).find();
        return advised && !NEGATED.matcher(text).find();
    }
}
