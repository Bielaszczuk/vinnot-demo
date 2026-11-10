package com.vinnot.marketing.infrastructure.social;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;
import java.util.Objects;

/**
 * Where and how the network adapters call Instagram, Facebook, Threads and TikTok (#510), from
 * {@code app.marketing.networks.*}. Tokens are never here: they come from {@code SocialAccountTokens}.
 *
 * @param pollInterval how often a container or publish status is checked while the network processes the images
 * @param pollTimeout  how long the adapter waits for that processing before giving up with {@code PROCESSING_TIMEOUT}
 */
@ConfigurationProperties(prefix = "app.marketing.networks")
public record SocialNetworksProperties(Meta meta, Threads threads, TikTok tiktok, Duration connectTimeout,
        Duration requestTimeout, Duration pollInterval, Duration pollTimeout) {

    static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(10);
    static final Duration DEFAULT_REQUEST_TIMEOUT = Duration.ofSeconds(30);
    static final Duration DEFAULT_POLL_INTERVAL = Duration.ofSeconds(15);
    static final Duration DEFAULT_POLL_TIMEOUT = Duration.ofMinutes(5);

    public SocialNetworksProperties {
        meta = Objects.requireNonNullElseGet(meta, () -> new Meta(null, null, null, null));
        threads = Objects.requireNonNullElseGet(threads, () -> new Threads(null, null));
        tiktok = Objects.requireNonNullElseGet(tiktok, () -> new TikTok(null));
        connectTimeout = Objects.requireNonNullElse(connectTimeout, DEFAULT_CONNECT_TIMEOUT);
        requestTimeout = Objects.requireNonNullElse(requestTimeout, DEFAULT_REQUEST_TIMEOUT);
        pollInterval = Objects.requireNonNullElse(pollInterval, DEFAULT_POLL_INTERVAL);
        pollTimeout = Objects.requireNonNullElse(pollTimeout, DEFAULT_POLL_TIMEOUT);
        if (connectTimeout.toMillis() < 1 || requestTimeout.toMillis() < 1 || connectTimeout.compareTo(requestTimeout) > 0) {
            throw new IllegalArgumentException("Social network timeouts must be positive, connect within request");
        }
        // The poller itself checks the interval against the timeout.
    }

    /**
     * The Meta Graph API (Instagram with Unified Login and Facebook Pages).
     *
     * @param instagramMetrics the media insights to ask for; every one must be valid for carousels or Meta refuses all
     * @param instagramAltText whether carousel images carry their alt text ({@code alt_text}, added by Meta in 2025)
     */
    public record Meta(String baseUrl, String version, List<String> instagramMetrics, Boolean instagramAltText) {

        static final List<String> DEFAULT_INSTAGRAM_METRICS = List.of("views", "reach", "likes", "comments", "saved",
                "shares");

        public Meta {
            baseUrl = requireText(Objects.requireNonNullElse(baseUrl, "https://graph.facebook.com"), "meta.base-url");
            version = requireText(Objects.requireNonNullElse(version, "v27.0"), "meta.version");
            instagramMetrics = List.copyOf(Objects.requireNonNullElse(instagramMetrics, DEFAULT_INSTAGRAM_METRICS));
            instagramAltText = Objects.requireNonNullElse(instagramAltText, true);
            if (instagramMetrics.isEmpty() || instagramMetrics.stream().anyMatch(String::isBlank)) {
                throw new IllegalArgumentException("Instagram metrics must name at least one metric");
            }
        }
    }

    /** The Threads API. */
    public record Threads(String baseUrl, String version) {
        public Threads {
            baseUrl = requireText(Objects.requireNonNullElse(baseUrl, "https://graph.threads.com"), "threads.base-url");
            version = requireText(Objects.requireNonNullElse(version, "v1.0"), "threads.version");
        }
    }

    /** The TikTok Content Posting API. */
    public record TikTok(String baseUrl) {
        public TikTok {
            baseUrl = requireText(Objects.requireNonNullElse(baseUrl, "https://open.tiktokapis.com"), "tiktok.base-url");
        }
    }

    private static String requireText(String value, String name) {
        if (value.isBlank()) {
            throw new IllegalArgumentException("app.marketing.networks." + name + " must not be blank");
        }
        return value.strip();
    }
}
