package com.vinnot.marketing.infrastructure.render;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** In-memory render assets so the renderer tests never depend on the bundled artwork. */
final class SyntheticAssets {
    static final List<String> PILLARS = List.of("WINE_DAY", "CURIOUS_FACT", "EDUCATION", "MYTH_VS_REALITY", "QUIZ", "PAIRING",
            "GRAPE_OF_MONTH", "HUMOR", "APP_FEATURE");
    static final Color VIGNETTE = new Color(0, 0, 255);
    static final Color ILLUSTRATION = new Color(0, 200, 0);
    static final Color SECOND_VIGNETTE = new Color(255, 140, 0);

    private SyntheticAssets() {
    }

    static RenderAssets none() {
        return new RenderAssets(path -> null);
    }

    static RenderAssets complete() {
        Map<String, byte[]> files = new HashMap<>();
        files.put("marketing/render/paper.png", png(opaque(200, 300, new Color(0xF2E8D5))));
        for (RenderAssets.Ornament ornament : RenderAssets.Ornament.values()) {
            files.put("marketing/render/ornaments/" + ornament.fileName() + ".png", png(disc(300, 200, new Color(0x6B7A3A))));
        }
        PILLARS.forEach(code -> {
            files.put("marketing/render/vignettes/" + code + "-1.png", png(disc(400, 400, VIGNETTE)));
            files.put("marketing/render/vignettes/" + code + "-2.png", png(disc(400, 400, SECOND_VIGNETTE)));
        });
        return new RenderAssets(path -> files.containsKey(path) ? new ByteArrayInputStream(files.get(path)) : null);
    }

    static byte[] illustration() {
        return png(disc(600, 400, ILLUSTRATION));
    }

    static BufferedImage opaque(int width, int height, Color color) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(color);
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();
        return image;
    }

    /** A transparent canvas with a filled ellipse, like a vignette or an ornament. */
    static BufferedImage disc(int width, int height, Color color) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(color);
        graphics.fillOval(width / 8, height / 8, width * 3 / 4, height * 3 / 4);
        graphics.dispose();
        return image;
    }

    static byte[] png(BufferedImage image) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
