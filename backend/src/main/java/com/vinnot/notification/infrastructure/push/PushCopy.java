package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;

import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.ResourceBundle;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Push copy from {@code push/<name>_<language>.properties}, without falling back to another language. Placeholders
 * are replaced in one pass, so an event title that looks like a placeholder stays literal.
 */
final class PushCopy {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([a-zA-Z]+)}");
    private final ResourceBundle bundle;

    private PushCopy(ResourceBundle bundle) {
        this.bundle = bundle;
    }

    static PushCopy load(String name, NotificationLocale locale) {
        return new PushCopy(ResourceBundle.getBundle("push." + name, Locale.forLanguageTag(locale.language()),
                ResourceBundle.Control.getNoFallbackControl(ResourceBundle.Control.FORMAT_PROPERTIES)));
    }

    boolean has(String key) {
        return bundle.containsKey(key);
    }

    String text(String key, Map<String, String> values) {
        return PLACEHOLDER.matcher(bundle.getString(key)).replaceAll(match -> Matcher.quoteReplacement(
                Objects.requireNonNull(values.get(match.group(1)), "Missing push copy value " + match.group(1))));
    }
}
