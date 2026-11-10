package com.vinnot.marketing.infrastructure.render;

import com.vinnot.marketing.application.port.out.SlideRenderer;

import java.awt.Font;
import java.awt.font.FontRenderContext;
import java.awt.font.LineBreakMeasurer;
import java.awt.font.LineMetrics;
import java.awt.font.TextAttribute;
import java.awt.font.TextLayout;
import java.text.AttributedString;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Wraps text into a box and shrinks it until it fits (#492). Whole words are kept while the size can still go down; at
 * the floor size a word wider than the box is split instead of cut. Text that still overflows fails as
 * {@link SlideRenderer.Reason#TEXT_DOES_NOT_FIT}: the copy limits are meant to prevent it.
 */
final class TextFitter {
    /** Antialiased, fractional metrics: the same context {@link Java2dSlideRenderer} draws with. */
    static final FontRenderContext CONTEXT = new FontRenderContext(null, true, true);
    private static final float STEP = 2f;

    private TextFitter() {
    }

    static FittedText fit(String text, Font font, float maxSize, float minSize, float width, float height, float lineSpacing) {
        String clean = displayable(text, font);
        for (float size = maxSize; size > minSize; size -= STEP) {
            FittedText fitted = layout(clean, font.deriveFont(size), width, lineSpacing, true);
            if (Objects.nonNull(fitted) && fitted.height() <= height) {
                return fitted;
            }
        }
        for (boolean wholeWords : new boolean[] {true, false}) {
            FittedText fitted = layout(clean, font.deriveFont(minSize), width, lineSpacing, wholeWords);
            if (Objects.nonNull(fitted) && fitted.height() <= height) {
                return fitted;
            }
        }
        throw new SlideRenderer.SlideRenderingException(SlideRenderer.Reason.TEXT_DOES_NOT_FIT, "Text of " + clean.length()
                + " characters does not fit a " + Math.round(width) + "x" + Math.round(height) + " box at " + minSize + "px");
    }

    /** One line of letter-spaced text, such as the wordmark or the progress marker; never wrapped. */
    static FittedText line(String text, Font font, float size, float tracking) {
        Font sized = font.deriveFont(Map.of(TextAttribute.SIZE, size, TextAttribute.TRACKING, tracking));
        String clean = displayable(text, font);
        LineMetrics metrics = sized.getLineMetrics("Hg", CONTEXT);
        List<TextLayout> lines = clean.isEmpty() ? List.of() : List.of(new TextLayout(clean, sized, CONTEXT));
        return new FittedText(lines, size, metrics.getAscent(), metrics.getDescent(), metrics.getAscent() + metrics.getDescent());
    }

    /**
     * The text in NFC with every code point the font cannot draw removed (emoji, pictographs, joiners), whitespace inside
     * lines collapsed and blank lines dropped, so no missing-glyph boxes reach the slide.
     */
    static String displayable(String text, Font font) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFC);
        StringBuilder kept = new StringBuilder(normalized.length());
        normalized.codePoints().filter(point -> point == '\n' || Character.isWhitespace(point) || font.canDisplay(point))
                .forEach(kept::appendCodePoint);
        return kept.toString().lines().map(line -> line.replaceAll("\\s+", " ").strip()).filter(line -> !line.isEmpty())
                .reduce((first, second) -> first + "\n" + second).orElse("");
    }

    private static FittedText layout(String text, Font font, float width, float lineSpacing, boolean wholeWords) {
        LineMetrics metrics = font.getLineMetrics("Hg", CONTEXT);
        float pitch = (metrics.getAscent() + metrics.getDescent()) * lineSpacing;
        List<TextLayout> lines = new ArrayList<>();
        for (String paragraph : text.isEmpty() ? List.<String>of() : text.lines().toList()) {
            AttributedString attributed = new AttributedString(paragraph);
            attributed.addAttribute(TextAttribute.FONT, font);
            LineBreakMeasurer measurer = new LineBreakMeasurer(attributed.getIterator(), CONTEXT);
            while (measurer.getPosition() < paragraph.length()) {
                TextLayout line = measurer.nextLayout(width, paragraph.length(), wholeWords);
                if (Objects.isNull(line)) {
                    return null;
                }
                lines.add(line);
            }
        }
        return new FittedText(lines, font.getSize2D(), metrics.getAscent(), metrics.getDescent(), pitch);
    }
}
