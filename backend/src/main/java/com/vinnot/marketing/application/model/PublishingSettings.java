package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * What publishing may do (#510 S9), from {@code app.marketing.publishing.*}: whether publishing is switched on at all, the
 * networks it publishes to (none by default), iterated in network order, and how long after its slot an approved post may
 * still wait for its media before it fails with {@code MEDIA_NOT_READY}. A network may have a not-before time (#513 S4), a
 * local time in {@code zone} (the planner's): on the post's day it publishes no earlier than that time.
 */
public record PublishingSettings(boolean enabled, Set<SocialNetwork> networks, Duration mediaGrace, ZoneId zone,
        Map<SocialNetwork, LocalTime> notBefore) {
    /** The planner's default zone, for settings without per-network times. */
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    public PublishingSettings {
        networks = Collections.unmodifiableSet(networks.isEmpty() ? EnumSet.noneOf(SocialNetwork.class) : EnumSet.copyOf(networks));
        Objects.requireNonNull(mediaGrace, "mediaGrace");
        Objects.requireNonNull(zone, "zone");
        notBefore = Collections.unmodifiableMap(notBefore.isEmpty() ? new EnumMap<>(SocialNetwork.class) : new EnumMap<>(notBefore));
    }

    /** Settings where every network publishes at the post time. */
    public PublishingSettings(boolean enabled, Set<SocialNetwork> networks, Duration mediaGrace) {
        this(enabled, networks, mediaGrace, DEFAULT_ZONE, Map.of());
    }

    /** Whether a publication on the network may go out now: publishing and that network are both switched on. */
    public boolean publishes(SocialNetwork network) {
        return enabled && networks.contains(network);
    }

    /** Whether anything can be published: publishing is switched on and at least one network is enabled. */
    public boolean publishesAny() {
        return enabled && !networks.isEmpty();
    }

    /** When a post due at {@code postTime} goes out on the network: the post time, or its day's not-before time when later. */
    public Instant publishAt(SocialNetwork network, Instant postTime) {
        LocalTime earliest = notBefore.get(network);
        if (Objects.isNull(earliest)) {
            return postTime;
        }
        Instant floor = postTime.atZone(zone).toLocalDate().atTime(earliest).atZone(zone).toInstant();
        return floor.isAfter(postTime) ? floor : postTime;
    }

    /** How long a publication started at {@code now} waits before it goes out on the network: never negative. */
    public Duration delay(SocialNetwork network, Instant postTime, Instant now) {
        Duration wait = Duration.between(now, publishAt(network, postTime));
        return wait.isNegative() ? Duration.ZERO : wait;
    }
}
