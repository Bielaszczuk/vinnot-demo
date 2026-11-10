package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * The formatted content an administrator writes for an announcement (#310). It is a small text format, never HTML,
 * so nothing the author types can reach an email as markup:
 *
 * <ul>
 *   <li>a line starting with {@code ## } is a heading;</li>
 *   <li>a line that is only {@code [[Label]](https://…)} is a button;</li>
 *   <li>other lines form paragraphs, separated by a blank line; a single line break stays a line break;</li>
 *   <li>inside a paragraph, {@code **text**} is bold and {@code [text](https://…)} is a link.</li>
 * </ul>
 *
 * Links and buttons must be absolute HTTP(S) addresses without credentials.
 */
public record AnnouncementBody(List<Block> blocks) {
    public static final int MAX_LENGTH = 5000;
    private static final String HEADING = "## ";
    /** An address, allowing one level of balanced parentheses as in {@code …/Malbec_(grape)}. */
    private static final String URL = "(?<url>(?:[^\\s()]|\\([^\\s()]*\\))+)";
    private static final Pattern BUTTON = Pattern.compile("^\\[\\[(?<label>[^\\]\\n]{1,60})]]\\(" + URL + "\\)$");
    private static final Pattern INLINE =
            Pattern.compile("\\*\\*(?<bold>.+?)\\*\\*|\\[(?<text>[^\\]\\n]+)]\\(" + URL + "\\)");

    public AnnouncementBody {
        blocks = List.copyOf(blocks);
    }

    /** One block of the announcement, in reading order. */
    public sealed interface Block permits Heading, Paragraph, Button { }

    public record Heading(String text) implements Block { }

    public record Paragraph(List<Span> spans) implements Block {
        public Paragraph {
            spans = List.copyOf(spans);
        }
    }

    public record Button(String label, String url) implements Block { }

    /** A run of paragraph text; line breaks are kept as {@code \n}. */
    public sealed interface Span permits Text, Link { }

    public record Text(String text, boolean bold) implements Span { }

    public record Link(String text, String url) implements Span { }

    /** Parses the author's text; an empty, too long or badly linked text is refused. */
    public static AnnouncementBody parse(String source) {
        String text = Objects.requireNonNullElse(source, "").replace("\r\n", "\n").replace('\r', '\n').strip();
        if (text.isEmpty()) {
            throw new DomainException("ANNOUNCEMENT_BODY_REQUIRED", "Write the content of the announcement");
        }
        if (text.length() > MAX_LENGTH) {
            throw new DomainException("ANNOUNCEMENT_BODY_TOO_LONG", "The content can have at most " + MAX_LENGTH + " characters");
        }
        List<Block> blocks = new ArrayList<>();
        List<String> paragraph = new ArrayList<>();
        for (String raw : text.split("\n", -1)) {
            String line = raw.strip();
            Matcher button = BUTTON.matcher(line);
            if (line.isEmpty() || line.startsWith(HEADING) || button.matches()) {
                closeParagraph(paragraph, blocks);
            }
            if (line.startsWith(HEADING)) {
                blocks.add(new Heading(line.substring(HEADING.length()).strip()));
            } else if (button.matches()) {
                blocks.add(new Button(button.group("label").strip(), webUrl(button.group("url"))));
            } else if (!line.isEmpty()) {
                paragraph.add(line);
            }
        }
        closeParagraph(paragraph, blocks);
        AnnouncementBody body = new AnnouncementBody(blocks);
        if (body.plainText().isBlank()) {
            throw new DomainException("ANNOUNCEMENT_BODY_REQUIRED", "Write the content of the announcement");
        }
        return body;
    }

    /** The content as plain text: headings and paragraphs, links as "text (address)", buttons as "label: address". */
    public String plainText() {
        return blocks.stream().map(block -> switch (block) {
            case Heading heading -> heading.text();
            case Paragraph paragraph -> paragraph.spans().stream().map(span -> switch (span) {
                case Text run -> run.text();
                case Link link -> link.text() + " (" + link.url() + ")";
            }).collect(Collectors.joining());
            case Button button -> button.label() + ": " + button.url();
        }).collect(Collectors.joining("\n\n"));
    }

    /** The paragraphs' words without addresses, for a push body. */
    public String summary() {
        return blocks.stream().filter(Paragraph.class::isInstance).map(Paragraph.class::cast)
                .map(paragraph -> paragraph.spans().stream().map(span -> switch (span) {
                    case Text run -> run.text();
                    case Link link -> link.text();
                }).collect(Collectors.joining()).replace('\n', ' '))
                .collect(Collectors.joining(" "));
    }

    private static void closeParagraph(List<String> lines, List<Block> blocks) {
        if (lines.isEmpty()) {
            return;
        }
        blocks.add(new Paragraph(spans(String.join("\n", lines))));
        lines.clear();
    }

    private static List<Span> spans(String text) {
        List<Span> spans = new ArrayList<>();
        Matcher inline = INLINE.matcher(text);
        int start = 0;
        while (inline.find()) {
            if (inline.start() > start) {
                spans.add(new Text(text.substring(start, inline.start()), false));
            }
            if (Objects.nonNull(inline.group("bold"))) {
                spans.add(new Text(inline.group("bold"), true));
            } else {
                spans.add(new Link(inline.group("text"), webUrl(inline.group("url"))));
            }
            start = inline.end();
        }
        if (start < text.length()) {
            spans.add(new Text(text.substring(start), false));
        }
        return spans;
    }

    private static String webUrl(String value) {
        try {
            URI uri = new URI(value);
            if (("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                    && Objects.nonNull(uri.getHost()) && Objects.isNull(uri.getUserInfo())) {
                return value;
            }
        } catch (URISyntaxException invalid) {
            // reported below
        }
        throw new DomainException("INVALID_ANNOUNCEMENT_LINK", "Links and buttons need a full https:// address: " + value);
    }
}
