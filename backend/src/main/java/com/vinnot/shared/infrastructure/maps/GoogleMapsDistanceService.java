package com.vinnot.shared.infrastructure.maps;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.application.port.RouteDistanceService;
import com.vinnot.shared.infrastructure.http.DeadlineHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import java.time.Duration;
import java.math.BigDecimal;

import java.util.List;
import java.util.Objects;

@Service
public class GoogleMapsDistanceService implements RouteDistanceService {

    private static final Logger LOG = LoggerFactory.getLogger(GoogleMapsDistanceService.class);

    private static final int MAX_STOPS = 27;
    private static final int MAXIMUM_BODY_BYTES = 1024 * 1024;
    private static final int MAX_LATITUDE = 90;
    private static final int MAX_LONGITUDE = 180;
    private final String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public GoogleMapsDistanceService(ObjectMapper objectMapper,
            @Value("${services.google.maps.api-key:}") String apiKey,
            @Value("${services.google.maps.connect-timeout:3s}") Duration connectTimeout,
            @Value("${services.google.maps.read-timeout:5s}") Duration readTimeout) {
        this(objectMapper, apiKey, configuredClient(connectTimeout, readTimeout));
    }

    GoogleMapsDistanceService(ObjectMapper objectMapper, String apiKey, RestTemplate client) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.restTemplate = client;
    }

    private static RestTemplate configuredClient(Duration connectTimeout, Duration readTimeout) {
        if (connectTimeout.toMillis() < 1 || connectTimeout.toMillis() > Integer.MAX_VALUE
                || readTimeout.toMillis() < 1 || readTimeout.toMillis() > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Maps timeouts must fit positive milliseconds");
        }
        return new RestTemplate(new DeadlineHttpRequestFactory(
                connectTimeout, readTimeout, MAXIMUM_BODY_BYTES, MAXIMUM_BODY_BYTES));
    }

    /**
     * Calculates total driving distance in km between ordered stops.
     * Accepts port-level LatLng coordinates.
     *
     * @param stops ordered list of coordinates
     * @return total distance in km, or null if calculation fails
     */
    @Override
    public Double calculateTotalDistanceKm(List<RouteDistanceService.LatLng> stops) {
        if (Objects.isNull(stops) || stops.size() < 2 || stops.size() > MAX_STOPS
                || stops.stream().anyMatch(stop -> Objects.isNull(stop)
                        || !validCoordinate(stop.latitude(), MAX_LATITUDE)
                        || !validCoordinate(stop.longitude(), MAX_LONGITUDE))) {
            return null;
        }
        return calculateDistanceInternal(stops);
    }

    /**
     * Calculates total driving distance in km between ordered stops.
     *
     * @param stops ordered list of coordinates
     * @return total distance in km, or null if calculation fails
     */
    private Double calculateDistanceInternal(
            List<RouteDistanceService.LatLng> stops) {
        if (Objects.isNull(apiKey) || apiKey.isBlank()) {
            LOG.warn("Google Maps API key not configured, skipping distance calculation");
            return null;
        }

        try {
            String origin = toParam(stops.getFirst());
            String destination = toParam(stops.getLast());

            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append("https://maps.googleapis.com/maps/api/directions/json?");
            urlBuilder.append("origin=").append(origin);
            urlBuilder.append("&destination=").append(destination);

            if (stops.size() > 2) {
                StringBuilder waypoints = new StringBuilder();
                for (int i = 1; i < stops.size() - 1; i++) {
                    if (waypoints.length() > 0) {
                        waypoints.append("|");
                    }
                    waypoints.append(toParam(stops.get(i)));
                }
                urlBuilder.append("&waypoints=").append(waypoints);
            }

            urlBuilder.append("&key=").append(apiKey);

            String url = urlBuilder.toString();
            LOG.info("Requesting Google Maps Directions for {} stops", stops.size());

            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);

            String status = root.path("status").asText();
            if (!"OK".equals(status)) {
                LOG.warn("Google Maps Directions returned an unsuccessful response");
                return null;
            }

            JsonNode legs = root.path("routes").get(0).path("legs");
            double totalMeters = 0;
            for (JsonNode leg : legs) {
                totalMeters += leg.path("distance").path("value").asDouble();
            }

            double totalKm = Math.round(totalMeters / 100.0) / 10.0; // 1 decimal
            LOG.info("Calculated route distance: {} km for {} stops", totalKm, stops.size());
            return totalKm;

        } catch (Exception e) {
            LOG.warn("Google Maps Directions failed: {}", e.getClass().getSimpleName());
            return null;
        }
    }

    private String toParam(RouteDistanceService.LatLng coordinate) {
        return coordinate.latitude() + "," + coordinate.longitude();
    }

    private boolean validCoordinate(BigDecimal value, int limit) {
        return Objects.nonNull(value) && value.abs().compareTo(BigDecimal.valueOf(limit)) <= 0;
    }
}
