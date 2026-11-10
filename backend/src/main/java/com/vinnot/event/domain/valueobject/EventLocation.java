package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.valueobject.Coordinates;

import java.util.Objects;

public final class EventLocation extends ValueObject {

    private final String name;
    private final String address;
    private final String city;
    private final String region;
    private final String country;
    private final Coordinates coordinates;
    private final String mapEmbedUrl;

    private EventLocation(String name, String address, String city, String region, String country,
                          Coordinates coordinates, String mapEmbedUrl) {
        this.name = name;
        this.address = address;
        this.city = city;
        this.region = region;
        this.country = country;
        this.coordinates = coordinates;
        this.mapEmbedUrl = mapEmbedUrl;
    }

    /**
     * Creates an EventLocation with all fields.
     *
     * @param name        the venue name
     * @param address     the street address
     * @param city        the city
     * @param region      the region/province
     * @param country     the country
     * @param coordinates the geographic coordinates
     * @param mapEmbedUrl the embed URL for Google Maps
     * @return the EventLocation value object
     */
    public static EventLocation of(String name, String address, String city, String region,
                                   String country,
                                   Coordinates coordinates, String mapEmbedUrl) {
        return new EventLocation(name, address, city, region, country, coordinates, mapEmbedUrl);
    }

    /**
     * Gets the venue name.
     *
     * @return the name
     */
    public String getName() {
        return name;
    }

    /**
     * Gets the street address.
     *
     * @return the address
     */
    public String getAddress() {
        return address;
    }

    /**
     * Gets the city.
     *
     * @return the city
     */
    public String getCity() {
        return city;
    }

    /**
     * Gets the region.
     *
     * @return the region
     */
    public String getRegion() {
        return region;
    }

    public String getCountry() {
        return country;
    }

    /**
     * Gets the coordinates.
     *
     * @return the coordinates
     */
    public Coordinates getCoordinates() {
        return coordinates;
    }

    /**
     * Gets the map embed URL.
     *
     * @return the map embed URL for iframe
     */
    public String getMapEmbedUrl() {
        return mapEmbedUrl;
    }

    /**
     * Checks if coordinates are present.
     *
     * @return true if coordinates are set
     */
    public boolean hasCoordinates() {
        return Objects.nonNull(coordinates);
    }

    /**
     * The venue as attendees read it: the full address, or {@code null} when it is empty.
     *
     * @return the readable venue, or null
     */
    public String getReadableVenue() {
        String venue = getFullAddress();
        return venue.isBlank() ? null : venue;
    }

    /**
     * Gets the full address string.
     *
     * @return formatted full address
     */
    public String getFullAddress() {
        StringBuilder sb = new StringBuilder();
        if (Objects.nonNull(name) && !name.isBlank()) {
            sb.append(name);
        }
        if (Objects.nonNull(address) && !address.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(", ");
            }
            sb.append(address);
        }
        if (Objects.nonNull(city) && !city.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(", ");
            }
            sb.append(city);
        }
        if (Objects.nonNull(region) && !region.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(", ");
            }
            sb.append(region);
        }
        if (Objects.nonNull(country) && !country.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(", ");
            }
            sb.append(country);
        }
        return sb.toString();
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{name, address, city, region, country, coordinates, mapEmbedUrl};
    }

    @Override
    public String toString() {
        return getFullAddress();
    }
}
