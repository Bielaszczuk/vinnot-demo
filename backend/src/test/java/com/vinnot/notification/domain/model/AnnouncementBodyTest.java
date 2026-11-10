package com.vinnot.notification.domain.model;

import com.vinnot.notification.domain.model.AnnouncementBody.Button;
import com.vinnot.notification.domain.model.AnnouncementBody.Heading;
import com.vinnot.notification.domain.model.AnnouncementBody.Link;
import com.vinnot.notification.domain.model.AnnouncementBody.Paragraph;
import com.vinnot.notification.domain.model.AnnouncementBody.Text;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AnnouncementBodyTest {
    @Test
    void readsHeadingsParagraphsBoldLinksAndButtons() {
        AnnouncementBody body = AnnouncementBody.parse("""
                ## Harvest weekend
                Join us on **Saturday** at the winery.
                Details in [our events](https://vinnot.com/events).

                [[See events]](https://vinnot.com/events)
                """);

        assertThat(body.blocks()).containsExactly(
                new Heading("Harvest weekend"),
                new Paragraph(List.of(new Text("Join us on ", false), new Text("Saturday", true),
                        new Text(" at the winery.\nDetails in ", false), new Link("our events", "https://vinnot.com/events"),
                        new Text(".", false))),
                new Button("See events", "https://vinnot.com/events"));
        assertThat(body.plainText()).isEqualTo("""
                Harvest weekend

                Join us on Saturday at the winery.
                Details in our events (https://vinnot.com/events).

                See events: https://vinnot.com/events""");
        assertThat(body.summary()).isEqualTo("Join us on Saturday at the winery. Details in our events.");
    }

    @Test
    void markupIsNeverHtmlAndUnfinishedMarksStayText() {
        AnnouncementBody body = AnnouncementBody.parse("<b>hi</b> **open\r\n#not a heading\n\n\n\nnext");

        assertThat(body.blocks()).containsExactly(
                new Paragraph(List.of(new Text("<b>hi</b> **open\n#not a heading", false))),
                new Paragraph(List.of(new Text("next", false))));
    }

    @Test
    void addressesKeepBalancedParenthesesAndABodyWithoutVisibleTextIsRefused() {
        AnnouncementBody body = AnnouncementBody.parse("Read about [Malbec](https://en.wikipedia.org/wiki/Malbec_(grape)).\n"
                + "[[Learn more]](https://vinnot.com/wines_(red))");

        assertThat(body.blocks()).containsExactly(
                new Paragraph(List.of(new Text("Read about ", false), new Link("Malbec", "https://en.wikipedia.org/wiki/Malbec_(grape)"),
                        new Text(".", false))),
                new Button("Learn more", "https://vinnot.com/wines_(red)"));
        assertThatThrownBy(() -> AnnouncementBody.parse("**   **")).hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_BODY_REQUIRED");
    }

    @Test
    void refusesEmptyTooLongAndUnsafeLinks() {
        assertThatThrownBy(() -> AnnouncementBody.parse("  \n ")).isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_BODY_REQUIRED");
        assertThatThrownBy(() -> AnnouncementBody.parse("x".repeat(AnnouncementBody.MAX_LENGTH + 1)))
                .hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_BODY_TOO_LONG");
        for (String unsafe : List.of("[x](javascript:alert(1))", "[x](https://user:pass@vinnot.com)", "[[Go]](/events)",
                "[x](mailto:team@vinnot.com)")) {
            assertThatThrownBy(() -> AnnouncementBody.parse(unsafe)).as(unsafe)
                    .hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_LINK");
        }
        assertThat(AnnouncementBody.parse("x".repeat(AnnouncementBody.MAX_LENGTH)).blocks()).hasSize(1);
    }
}
