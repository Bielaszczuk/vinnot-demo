package com.vinnot.marketing.infrastructure.render;

import com.vinnot.marketing.application.model.SlideFormat;

/**
 * The canvas and the safe area where text goes. TikTok draws its own interface over the top (about 220px) and the bottom
 * (about 380px) of a 1080x1920 post and its action buttons on the right, so its text stays in a narrower central band.
 */
record SlideGeometry(int width, int height, int left, int top, int right, int bottom) {
    private static final SlideGeometry INSTAGRAM = new SlideGeometry(SlideFormat.INSTAGRAM.width(), SlideFormat.INSTAGRAM.height(),
            110, 120, 110, 110);
    private static final SlideGeometry TIKTOK = new SlideGeometry(SlideFormat.TIKTOK.width(), SlideFormat.TIKTOK.height(),
            140, 260, 140, 420);

    static SlideGeometry of(SlideFormat format) {
        return switch (format) {
            case INSTAGRAM -> INSTAGRAM;
            case TIKTOK -> TIKTOK;
        };
    }

    int safeWidth() {
        return width - left - right;
    }

    int safeBottom() {
        return height - bottom;
    }

    int safeHeight() {
        return safeBottom() - top;
    }
}
