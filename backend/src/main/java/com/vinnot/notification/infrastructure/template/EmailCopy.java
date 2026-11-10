package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.NotificationLocale;

import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.ResourceBundle;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Copy from {@code email/<name>_<language>.properties}. There is no fallback to another language, and
 * placeholders are replaced in one pass, so user text that looks like a placeholder stays literal.
 */
public final class EmailCopy {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([a-zA-Z]+)}");
    private final ResourceBundle bundle;

    private EmailCopy(ResourceBundle bundle) {
        this.bundle = bundle;
    }

    /** Throws {@link java.util.MissingResourceException} when the bundle does not exist for the locale. */
    public static EmailCopy load(String name, NotificationLocale locale) {
        return new EmailCopy(ResourceBundle.getBundle("email." + name, Locale.forLanguageTag(locale.language()),
                ResourceBundle.Control.getNoFallbackControl(ResourceBundle.Control.FORMAT_PROPERTIES)));
    }

    /** Whether the bundle has this key, for copy that falls back when a code has no text of its own. */
    public boolean has(String key) {
        return bundle.containsKey(key);
    }

    public String text(String key) {
        return bundle.getString(key);
    }

    public String text(String key, Map<String, String> values) {
        return PLACEHOLDER.matcher(text(key)).replaceAll(match -> Matcher.quoteReplacement(
                Objects.requireNonNull(values.get(match.group(1)), "Missing email copy value " + match.group(1))));
    }
}
