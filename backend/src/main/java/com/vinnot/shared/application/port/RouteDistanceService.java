package com.vinnot.shared.application.port;

import java.math.BigDecimal;
import java.util.List;

public interface RouteDistanceService {

    /**
     * Represents a coordinate pair.
     */
    record LatLng(BigDecimal latitude, BigDecimal longitude) {
    }

    /**
     * Calculates total driving distance in km between ordered stops.
     *
     * @param stops ordered list of coordinates
     * @return total distance in km, or null if calculation fails
     */
    Double calculateTotalDistanceKm(List<LatLng> stops);
}

