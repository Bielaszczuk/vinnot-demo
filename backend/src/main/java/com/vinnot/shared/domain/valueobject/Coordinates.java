package com.vinnot.shared.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.util.Objects;

public final class Coordinates extends ValueObject {

    private static final int MIN_LATITUDE = -90;
    private static final int MAX_LATITUDE = 90;
    private static final int MIN_LONGITUDE = -180;
    private static final int MAX_LONGITUDE = 180;
    private static final double EARTH_RADIUS_KM = 6371.0;

    private final BigDecimal latitude;
    private final BigDecimal longitude;

    private Coordinates(BigDecimal latitude, BigDecimal longitude) {
        validateLatitude(latitude);
        validateLongitude(longitude);
        this.latitude = latitude;
        this.longitude = longitude;
    }

    /**
     * Creates Coordinates from BigDecimal values.
     *
     * @param latitude  the latitude value
     * @param longitude the longitude value
     * @return the Coordinates value object
     */
    public static Coordinates of(BigDecimal latitude, BigDecimal longitude) {
        return new Coordinates(latitude, longitude);
    }

    /**
     * Creates Coordinates from double values.
     *
     * @param latitude  the latitude value
     * @param longitude the longitude value
     * @return the Coordinates value object
     */
    public static Coordinates of(double latitude, double longitude) {
        return new Coordinates(BigDecimal.valueOf(latitude), BigDecimal.valueOf(longitude));
    }

    private void validateLatitude(BigDecimal lat) {
        if (lat.doubleValue() < MIN_LATITUDE || lat.doubleValue() > MAX_LATITUDE) {
            throw new DomainException("INVALID_LATITUDE",
                    String.format("Latitude must be between %d and %d", MIN_LATITUDE, MAX_LATITUDE));
        }
    }

    private void validateLongitude(BigDecimal lon) {
        if (lon.doubleValue() < MIN_LONGITUDE || lon.doubleValue() > MAX_LONGITUDE) {
            throw new DomainException("INVALID_LONGITUDE",
                    String.format("Longitude must be between %d and %d", MIN_LONGITUDE, MAX_LONGITUDE));
        }
    }

    /**
     * Gets the latitude.
     *
     * @return the latitude value
     */
    public BigDecimal getLatitude() {
        return latitude;
    }

    /**
     * Gets the longitude.
     *
     * @return the longitude value
     */
    public BigDecimal getLongitude() {
        return longitude;
    }

    /**
     * Calculates distance to another coordinate using Haversine formula.
     *
     * @param other the other coordinates
     * @return distance in kilometers
     */
    public double distanceToKm(Coordinates other) {
        Objects.requireNonNull(other, "Other coordinates cannot be null");

        double lat1Rad = Math.toRadians(this.latitude.doubleValue());
        double lat2Rad = Math.toRadians(other.latitude.doubleValue());
        double deltaLat = Math.toRadians(other.latitude.subtract(this.latitude).doubleValue());
        double deltaLon = Math.toRadians(other.longitude.subtract(this.longitude).doubleValue());

        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(lat1Rad) * Math.cos(lat2Rad)
                * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{latitude, longitude};
    }

    @Override
    public String toString() {
        return String.format("(%s, %s)", latitude, longitude);
    }
}

