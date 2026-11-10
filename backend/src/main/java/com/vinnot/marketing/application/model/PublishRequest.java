package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.SocialNetwork;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * One post to publish on one network (#510): the public URLs of its carousel images in order, their alt text and the
 * network's caption.
 */
public record PublishRequest(UUID postId, SocialNetwork network, List<String> imageUrls,
        String altText, NetworkCaption caption) {
    public PublishRequest {
        Objects.requireNonNull(postId, "postId");
        Objects.requireNonNull(network, "network");
        imageUrls = List.copyOf(Objects.requireNonNull(imageUrls, "imageUrls"));
        Objects.requireNonNull(caption, "caption");
    }
}
