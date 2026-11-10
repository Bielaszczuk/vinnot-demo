package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;

import java.util.Map;
import java.util.Objects;

/** A push template whose copy lives in one {@code push/<name>} bundle per language. */
abstract class BundlePushTemplate implements PushTemplate {
    private final NotificationType type;
    private final String bundle;

    BundlePushTemplate(NotificationType type, String bundle) {
        this.type = type;
        this.bundle = bundle;
    }

    @Override
    public NotificationType type() {
        return type;
    }

    @Override
    public PushContent render(NotificationLocale locale, Map<String, String> data) {
        return render(PushCopy.load(bundle, locale), locale, data);
    }

    protected abstract PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data);

    protected static String required(Map<String, String> data, String key) {
        return Objects.requireNonNull(data.get(key), "Missing push data " + key);
    }

    /** A title and body pair stored as {@code <key>.title} and {@code <key>.body}. */
    protected static PushContent content(PushCopy copy, String key, Map<String, String> values, String route) {
        return new PushContent(copy.text(key + ".title", values), copy.text(key + ".body", values), route);
    }
}
