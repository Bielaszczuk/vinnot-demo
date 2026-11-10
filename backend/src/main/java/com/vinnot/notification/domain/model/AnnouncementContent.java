package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;

/** One language version of an announcement (#310): a title for the subject and push, and the formatted body. */
public record AnnouncementContent(String title, String body) {
    public static final int MAX_TITLE = 120;

    public AnnouncementContent {
        title = Objects.requireNonNullElse(title, "").strip();
        if (title.isEmpty() || title.length() > MAX_TITLE || title.contains("\n") || title.contains("\r")) {
            throw new DomainException("INVALID_ANNOUNCEMENT_TITLE", "The title needs 1 to " + MAX_TITLE + " characters on one line");
        }
        body = Objects.requireNonNullElse(body, "").strip();
        AnnouncementBody.parse(body);
    }

    public AnnouncementBody parsedBody() {
        return AnnouncementBody.parse(body);
    }
}
