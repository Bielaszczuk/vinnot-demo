package com.vinnot.marketing.infrastructure.render;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;

/** High-quality resizing that keeps alpha: halves the image step by step so large downscales do not alias. */
final class ImageScaling {

    private ImageScaling() {
    }

    /** {@code source} scaled to fit inside {@code maxWidth x maxHeight}, keeping its aspect ratio. */
    static BufferedImage fit(BufferedImage source, int maxWidth, int maxHeight) {
        double scale = Math.min((double) maxWidth / source.getWidth(), (double) maxHeight / source.getHeight());
        return scale(source, (int) Math.round(source.getWidth() * scale), (int) Math.round(source.getHeight() * scale));
    }

    /** {@code source} scaled to cover {@code width x height} and centre-cropped to exactly that size. */
    static BufferedImage cover(BufferedImage source, int width, int height) {
        double scale = Math.max((double) width / source.getWidth(), (double) height / source.getHeight());
        BufferedImage scaled = scale(source, (int) Math.ceil(source.getWidth() * scale), (int) Math.ceil(source.getHeight() * scale));
        BufferedImage cropped = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = cropped.createGraphics();
        try {
            graphics.drawImage(scaled, -(scaled.getWidth() - width) / 2, -(scaled.getHeight() - height) / 2, null);
        } finally {
            graphics.dispose();
            scaled.flush();
        }
        return cropped;
    }

    static BufferedImage scale(BufferedImage source, int width, int height) {
        int targetWidth = Math.max(1, width);
        int targetHeight = Math.max(1, height);
        BufferedImage current = source;
        int currentWidth = source.getWidth();
        int currentHeight = source.getHeight();
        do {
            currentWidth = currentWidth / 2 >= targetWidth ? currentWidth / 2 : targetWidth;
            currentHeight = currentHeight / 2 >= targetHeight ? currentHeight / 2 : targetHeight;
            BufferedImage next = new BufferedImage(currentWidth, currentHeight, BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = next.createGraphics();
            try {
                graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                graphics.drawImage(current, 0, 0, currentWidth, currentHeight, null);
            } finally {
                graphics.dispose();
            }
            if (current != source) {
                current.flush();
            }
            current = next;
        } while (currentWidth != targetWidth || currentHeight != targetHeight);
        return current;
    }
}
