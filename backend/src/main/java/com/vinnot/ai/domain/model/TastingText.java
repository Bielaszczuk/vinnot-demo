package com.vinnot.ai.domain.model;

import java.text.Normalizer;
import java.util.Locale;
import java.util.StringJoiner;
import java.util.regex.Pattern;

/** Free tasting text read the same way by every classifier: lower case, no accents, keywords at word starts. */
final class TastingText {

    private static final String STEM_MARK = "*";

    private TastingText() {
    }

    static String normalized(String text) {
        String lower = text.toLowerCase(Locale.ROOT).strip();
        return Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    /**
     * One pattern for a set of normalized keywords, each starting at a word start so "sal" never matches "salvia".
     * A keyword is a whole word ("moras?") unless it ends with "*", which marks a stem ("raspberr*" matches
     * "raspberry" and "raspberries"). Keywords may hold small regex fragments such as "?" or alternations.
     */
    static Pattern keywords(String... keywords) {
        StringJoiner alternatives = new StringJoiner("|", "\\b(?:", ")");
        for (String keyword : keywords) {
            alternatives.add(keyword.endsWith(STEM_MARK)
                    ? keyword.substring(0, keyword.length() - STEM_MARK.length())
                    : keyword + "\\b");
        }
        return Pattern.compile(alternatives.toString());
    }
}
