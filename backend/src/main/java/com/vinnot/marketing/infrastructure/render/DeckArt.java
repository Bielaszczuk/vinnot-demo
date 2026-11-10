package com.vinnot.marketing.infrastructure.render;

import java.awt.image.BufferedImage;
import java.util.Objects;
import java.util.stream.Stream;

/** The rasters of one render, already scaled to their slots; any of them except the background may be absent. */
record DeckArt(BufferedImage background, BufferedImage cover, BufferedImage cornerLeft, BufferedImage cornerRight,
        BufferedImage divider, BufferedImage sprig) {

    DeckArt {
        Objects.requireNonNull(background, "background");
    }

    void flush() {
        Stream.of(background, cover, cornerLeft, cornerRight, divider, sprig).filter(Objects::nonNull).forEach(BufferedImage::flush);
    }
}
