package com.vinnot.marketing.infrastructure.render;

import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.font.TextAttribute;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Objects;

/**
 * The OFL fonts bundled under {@code marketing/render/fonts}: Cormorant Garamond for display text and Poppins, the brand
 * font, for bodies and labels. Loaded once per JVM from the classpath; system fonts are never used.
 */
record SlideFonts(Font display, Font displayItalic, Font body, Font bodyMedium, Font bodySemiBold) {
    private static final String FOLDER = "marketing/render/fonts/";

    static SlideFonts bundled() {
        return Holder.FONTS;
    }

    private static Font load(String file) {
        try (InputStream input = SlideFonts.class.getClassLoader().getResourceAsStream(FOLDER + file)) {
            if (Objects.isNull(input)) {
                throw new IllegalStateException("Bundled slide font is missing: " + FOLDER + file);
            }
            return Font.createFont(Font.TRUETYPE_FONT, input)
                    .deriveFont(Map.of(TextAttribute.KERNING, TextAttribute.KERNING_ON, TextAttribute.LIGATURES, TextAttribute.LIGATURES_ON));
        } catch (IOException | FontFormatException exception) {
            throw new IllegalStateException("Bundled slide font cannot be loaded: " + FOLDER + file, exception);
        }
    }

    private static final class Holder {
        private static final SlideFonts FONTS = new SlideFonts(load("CormorantGaramond_600SemiBold.ttf"),
                load("CormorantGaramond_500Medium_Italic.ttf"), load("Poppins_400Regular.ttf"), load("Poppins_500Medium.ttf"),
                load("Poppins_600SemiBold.ttf"));
    }
}
