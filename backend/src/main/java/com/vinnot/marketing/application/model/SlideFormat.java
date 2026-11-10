package com.vinnot.marketing.application.model;

/** The canvas of a rendered carousel (#492): Instagram portrait 4:5 and TikTok full screen 9:16, in pixels. */
public enum SlideFormat {
    INSTAGRAM(1080, 1350),
    TIKTOK(1080, 1920);

    private final int width;
    private final int height;

    SlideFormat(int width, int height) {
        this.width = width;
        this.height = height;
    }

    public int width() {
        return width;
    }

    public int height() {
        return height;
    }
}
