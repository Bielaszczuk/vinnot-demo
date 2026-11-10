package com.vinnot.shared.domain.util;

public final class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double DEGREES_TO_RADIANS = Math.PI / 180.0;
    private static final double RADIANS_TO_DEGREES = 180.0 / Math.PI;

    private GeoUtils() {
    }

    /**
     * Calculates the Haversine distance between two geographic coordinates.
     *
     * @param latitudeOne  first latitude
     * @param longitudeOne first longitude
     * @param latitudeTwo  second latitude
     * @param longitudeTwo second longitude
     * @return distance in kilometers
     */
    public static double haversineDistance(
            double latitudeOne,
            double longitudeOne,
            double latitudeTwo,
            double longitudeTwo) {

        double deltaLatitude = (latitudeTwo - latitudeOne) * DEGREES_TO_RADIANS;
        double deltaLongitude = (longitudeTwo - longitudeOne) * DEGREES_TO_RADIANS;

        double latOneRadians = latitudeOne * DEGREES_TO_RADIANS;
        double latTwoRadians = latitudeTwo * DEGREES_TO_RADIANS;

        double halfAngle = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2)
                + Math.cos(latOneRadians) * Math.cos(latTwoRadians)
                * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

        double centralAngle = 2 * Math.atan2(Math.sqrt(halfAngle), Math.sqrt(1 - halfAngle));

        return EARTH_RADIUS_KM * centralAngle;
    }

    /**
     * Calculates a bounding box for a given center point and radius.
     *
     * @param latitude  center latitude
     * @param longitude center longitude
     * @param radiusKm  radius in kilometers
     * @return array of [minLat, maxLat, minLon, maxLon]
     */
    public static double[] boundingBox(double latitude, double longitude, double radiusKm) {
        double latDelta = (radiusKm / EARTH_RADIUS_KM) * RADIANS_TO_DEGREES;
        double lonDelta = latDelta / Math.cos(latitude * DEGREES_TO_RADIANS);

        return new double[]{
                latitude - latDelta,
                latitude + latDelta,
                longitude - lonDelta,
                longitude + lonDelta
        };
    }
}

