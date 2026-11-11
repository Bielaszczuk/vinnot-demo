package com.vinnot.wine.application.port.out;

import java.util.Optional;

/** Driven port reading a catalog label image that Vinnot hosts (catalog CDN or a member's uploaded label). */
public interface CatalogImageSourcePort {

    /** The image bytes, or empty when the address is not Vinnot-hosted or the image cannot be read. */
    Optional<WineImageEmbeddingPort.LabelImage> load(String imageUrl);
}
