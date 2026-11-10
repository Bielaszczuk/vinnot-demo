package com.vinnot.marketing.infrastructure.render;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.font.TextLayout;
import java.util.List;

/** Wrapped lines laid out at the size that fits their box; {@link #height()} is the exact ink-box height. */
record FittedText(List<TextLayout> lines, float fontSize, float ascent, float descent, float pitch) {

    FittedText {
        lines = List.copyOf(lines);
    }

    float height() {
        return lines.isEmpty() ? 0f : ascent + descent + (lines.size() - 1) * pitch;
    }

    float width() {
        return (float) lines.stream().mapToDouble(TextLayout::getVisibleAdvance).max().orElse(0);
    }

    /** Draws every line centred in {@code [x, x + boxWidth]} starting at {@code top}. */
    void drawCentered(Graphics2D graphics, Color color, float x, float top, float boxWidth) {
        graphics.setColor(color);
        for (int index = 0; index < lines.size(); index++) {
            TextLayout line = lines.get(index);
            line.draw(graphics, x + (boxWidth - line.getVisibleAdvance()) / 2f, top + ascent + index * pitch);
        }
    }
}
