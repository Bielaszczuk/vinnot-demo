package com.vinnot.marketing.infrastructure.render;

import java.awt.Color;

/** The Vinnot watercolor palette for rendered slides; every text colour meets WCAG AA (4.5:1) on {@link #CREAM}. */
final class SlidePalette {
    /** Canvas fallback when the paper texture is missing. */
    static final Color CREAM = new Color(0xF6EEDD);
    /** Hooks, bodies and the legal line (about 12:1 on cream). */
    static final Color SEPIA = new Color(0x3B2A1E);
    /** Titles, the call to action and the wordmark (about 9:1 on cream). */
    static final Color WINE = new Color(0x7A2232);
    /** Small labels; darker than the brand olive #6B7A3A, which only reaches 3.9:1 on cream. */
    static final Color OLIVE = new Color(0x55622C);

    private SlidePalette() {
    }

    /** WCAG 2.x contrast ratio between two opaque colours. */
    @SuppressWarnings("checkstyle:MagicNumber")
    static double contrastRatio(Color first, Color second) {
        double lighter = Math.max(luminance(first), luminance(second));
        double darker = Math.min(luminance(first), luminance(second));
        return (lighter + 0.05) / (darker + 0.05);
    }

    @SuppressWarnings("checkstyle:MagicNumber")
    private static double luminance(Color color) {
        return 0.2126 * channel(color.getRed()) + 0.7152 * channel(color.getGreen()) + 0.0722 * channel(color.getBlue());
    }

    @SuppressWarnings("checkstyle:MagicNumber")
    private static double channel(int value) {
        double srgb = value / 255.0;
        return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    }
}
