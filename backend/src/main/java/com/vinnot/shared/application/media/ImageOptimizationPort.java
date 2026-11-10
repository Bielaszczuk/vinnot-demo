package com.vinnot.shared.application.media;

import java.io.InputStream;

/** A bounded raster transformation; provider/process details stay outside application code. */
public interface ImageOptimizationPort {
    enum Purpose {
        AVATAR(512, 128 * 1024), LABEL(1600, 512 * 1024), COVER(1600, 512 * 1024);
        private final int longEdge;
        private final int maxBytes;
        Purpose(int longEdge, int maxBytes) {
            this.longEdge = longEdge;
            this.maxBytes = maxBytes;
        }
        public int longEdge() { return longEdge; }
        public int maxBytes() { return maxBytes; }
    }
    record OptimizedImage(byte[] bytes, int width, int height) {
        public String contentType() { return "image/webp"; }
    }
    OptimizedImage optimize(InputStream source, String declaredType, long size, Purpose purpose);
}
