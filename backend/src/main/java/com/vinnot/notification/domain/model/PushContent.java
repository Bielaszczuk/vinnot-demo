package com.vinnot.notification.domain.model;

import java.util.Objects;

/**
 * What a device shows: a short title, one or two lines of body and the in-app route a tap opens. Lock screens cut
 * long text abruptly, so both are shortened at a word boundary with an ellipsis instead.
 */
public record PushContent(String title, String body, String route) {
    public static final int MAX_TITLE = 65;
    public static final int MAX_BODY = 178;

    public PushContent {
        title = shorten(Objects.requireNonNull(title, "title").strip(), MAX_TITLE);
        body = shorten(Objects.requireNonNull(body, "body").strip(), MAX_BODY);
        if (title.isEmpty() || body.isEmpty()) {
            throw new IllegalArgumentException("A push needs a title and a body");
        }
        if (Objects.isNull(route) || !route.startsWith("/") || route.startsWith("//")) {
            throw new IllegalArgumentException("A push route must be an in-app path");
        }
    }

    static String shorten(String text, int limit) {
        if (text.length() <= limit) {
            return text;
        }
        String cut = text.substring(0, limit - 1);
        int space = cut.lastIndexOf(' ');
        if (space > limit / 2) {
            cut = cut.substring(0, space);
        }
        return cut.stripTrailing().replaceAll("[\\p{Punct}&&[^)\\]]]+$", "") + "…";
    }
}
