package com.vinnot.notification.application.model;

import java.util.Map;
import java.util.Objects;
import java.util.LinkedHashMap;

/**
 * A ready-to-send message. {@code replyTo} is optional and only set when replies must reach someone else;
 * {@code headers} carries extra email headers such as List-Unsubscribe.
 */
public record RenderedNotification(String subject, String text, String html, String replyTo, Map<String, String> headers) {
    public RenderedNotification {
        Objects.requireNonNull(subject, "Subject cannot be null");
        Objects.requireNonNull(text, "Text body cannot be null");
        Objects.requireNonNull(html, "HTML body cannot be null");
        headers = Map.copyOf(Objects.requireNonNullElse(headers, Map.of()));
    }

    public RenderedNotification(String subject, String text, String html, String replyTo) {
        this(subject, text, html, replyTo, Map.of());
    }

    public RenderedNotification(String subject, String text, String html) {
        this(subject, text, html, null, Map.of());
    }

    public RenderedNotification withHeaders(Map<String, String> extra) {
        Map<String, String> merged = new LinkedHashMap<>(headers);
        merged.putAll(extra);
        return new RenderedNotification(subject, text, html, replyTo, merged);
    }

    @Override
    public String toString() {
        return "RenderedNotification[REDACTED]";
    }
}
