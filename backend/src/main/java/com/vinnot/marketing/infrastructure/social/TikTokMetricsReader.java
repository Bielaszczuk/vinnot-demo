package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.port.out.SocialMetricsReader;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.util.Optional;

/**
 * TikTok metrics (#510, S6): always none. The Display API only reports public videos ({@code video.list} /
 * {@code video.query}), and what the agent sends is a photo carousel, by default a draft in the creator's inbox whose
 * {@code publish_id} is not a video id, so there is nothing to read. Calls nothing.
 */
public final class TikTokMetricsReader implements SocialMetricsReader {

    @Override
    public SocialNetwork network() {
        return SocialNetwork.TIKTOK;
    }

    @Override
    public Optional<PublicationMetrics> read(String externalId) {
        return Optional.empty();
    }
}
