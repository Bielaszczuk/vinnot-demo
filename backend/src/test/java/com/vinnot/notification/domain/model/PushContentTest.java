package com.vinnot.notification.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PushContentTest {
    @Test
    void shortTextIsKeptAsIs() {
        var content = new PushContent("  Your ticket is confirmed ", "Tasting night, Oct 21", "/my-tickets/1");

        assertThat(content.title()).isEqualTo("Your ticket is confirmed");
        assertThat(content.body()).isEqualTo("Tasting night, Oct 21");
    }

    @Test
    void longTextIsShortenedAtAWordWithAnEllipsis() {
        String title = "Your registration for the autumn tasting at the northern cellar has been confirmed today";
        var content = new PushContent(title, "x ".repeat(120), "/events");

        assertThat(content.title()).hasSizeLessThanOrEqualTo(PushContent.MAX_TITLE).endsWith("…")
                .isEqualTo("Your registration for the autumn tasting at the northern cellar…");
        assertThat(content.body()).hasSizeLessThanOrEqualTo(PushContent.MAX_BODY).endsWith("x…");
        assertThat(PushContent.shorten("a".repeat(80), 65)).hasSize(65).endsWith("…");
        assertThat(PushContent.shorten("Event changed, " + "y".repeat(40) + " and more words to cut here", 60))
                .doesNotContain(",…");
    }

    @Test
    void needsTitleBodyAndAnInAppRoute() {
        assertThatThrownBy(() -> new PushContent(" ", "body", "/events")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PushContent("title", "body", "https://evil.example")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PushContent("title", "body", "//evil.example")).isInstanceOf(IllegalArgumentException.class);
    }
}
