package com.vinnot.marketing.application.model;

import java.util.List;
import java.util.Objects;

/**
 * The copy one network publishes (#510): its caption text, the hashtags, a title (TikTok only) and one topic tag (Threads
 * only).
 */
public record NetworkCaption(String text, String title, List<String> hashtags, String topicTag) {
    public NetworkCaption {
        Objects.requireNonNull(text, "text");
        hashtags = Objects.isNull(hashtags) ? List.of() : List.copyOf(hashtags);
    }
}
