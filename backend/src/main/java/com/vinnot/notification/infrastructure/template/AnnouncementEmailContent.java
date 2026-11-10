package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.AnnouncementBody;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.stream.Collectors;

/** Renders an administrator's announcement body (#310) with the branded, escaping email helpers. */
final class AnnouncementEmailContent {
    private AnnouncementEmailContent() {
    }

    static String html(AnnouncementBody body, BrandedEmailTemplate.Language language) {
        return body.blocks().stream().map(block -> switch (block) {
            case AnnouncementBody.Heading heading -> BrandedEmailTemplate.heading(heading.text());
            case AnnouncementBody.Paragraph paragraph -> BrandedEmailTemplate.richParagraph(paragraph.spans().stream()
                    .map(span -> switch (span) {
                        case AnnouncementBody.Text text -> text.bold()
                                ? BrandedEmailTemplate.bold(text.text()) : BrandedEmailTemplate.inlineText(text.text());
                        case AnnouncementBody.Link link -> BrandedEmailTemplate.link(link.url(), link.text());
                    }).collect(Collectors.joining()));
            case AnnouncementBody.Button button -> BrandedEmailTemplate.action(button.url(), button.label(), language);
        }).collect(Collectors.joining());
    }
}
