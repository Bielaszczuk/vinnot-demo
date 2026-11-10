package com.vinnot.marketing.application.model;

import java.util.Arrays;
import java.util.Objects;

/** One rendered carousel image (#492): its zero-based position in the deck and its JPEG bytes. */
public record RenderedSlide(int index, byte[] jpeg, int width, int height) {

    public RenderedSlide {
        if (index < 0) {
            throw new IllegalArgumentException("index must not be negative");
        }
        Objects.requireNonNull(jpeg, "jpeg");
        if (jpeg.length == 0) {
            throw new IllegalArgumentException("jpeg must not be empty");
        }
        if (width < 1 || height < 1) {
            throw new IllegalArgumentException("width and height must be positive");
        }
        jpeg = jpeg.clone();
    }

    @Override
    public byte[] jpeg() {
        return jpeg.clone();
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof RenderedSlide slide && index == slide.index && width == slide.width && height == slide.height
                && Arrays.equals(jpeg, slide.jpeg);
    }

    @Override
    public int hashCode() {
        return Objects.hash(index, width, height, Arrays.hashCode(jpeg));
    }

    @Override
    public String toString() {
        return "RenderedSlide[index=" + index + ", bytes=" + jpeg.length + ", width=" + width + ", height=" + height + "]";
    }
}
