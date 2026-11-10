package com.vinnot.event.domain.valueobject;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;

/**
 * Where a user wants to hear about new events: a catalogue region, or an approximate location. A location is rounded
 * to {@link #PRECISION} decimal of a degree (about 11 km) when the area is created, so a precise position is never
 * kept or stored.
 */
public final class EventArea {
    public static final int PRECISION = 1;
    /** How far from an approximate location an event still counts as near. */
    public static final double RADIUS_KM = 50;
    private static final double MAX_LATITUDE = 90;
    private static final double MAX_LONGITUDE = 180;

    private final UUID regionId;
    private final BigDecimal latitude;
    private final BigDecimal longitude;

    private EventArea(UUID regionId, BigDecimal latitude, BigDecimal longitude) {
        this.regionId = regionId;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public static EventArea region(UUID regionId) {
        return new EventArea(Objects.requireNonNull(regionId, "regionId"), null, null);
    }

    public static EventArea approximate(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude) || Math.abs(latitude) > MAX_LATITUDE || Math.abs(longitude) > MAX_LONGITUDE) {
            throw new IllegalArgumentException("An approximate location needs a valid latitude and longitude");
        }
        return new EventArea(null, round(latitude), round(longitude));
    }

    private static BigDecimal round(double value) {
        return BigDecimal.valueOf(value).setScale(PRECISION, RoundingMode.HALF_UP);
    }

    public boolean isRegion() {
        return Objects.nonNull(regionId);
    }

    public UUID regionId() {
        return regionId;
    }

    public BigDecimal latitude() {
        return latitude;
    }

    public BigDecimal longitude() {
        return longitude;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof EventArea area && Objects.equals(regionId, area.regionId)
                && Objects.equals(latitude, area.latitude) && Objects.equals(longitude, area.longitude);
    }

    @Override
    public int hashCode() {
        return Objects.hash(regionId, latitude, longitude);
    }

    /** Never prints the location, even rounded. */
    @Override
    public String toString() {
        return isRegion() ? "EventArea[region=" + regionId + "]" : "EventArea[approximate]";
    }
}
