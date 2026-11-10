package com.vinnot.winery.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.valueobject.Coordinates;

import java.util.Objects;

/**
 * Value object representing a physical location with address and coordinates.
 */
public final class Location extends ValueObject {

    private final String address;
    private final Coordinates coordinates;

    private Location(String address, Coordinates coordinates) {
        this.address = address;
        this.coordinates = coordinates;
    }

    /**
     * Creates a Location with address and coordinates.
     *
     * @param address     the physical address
     * @param coordinates the geographic coordinates
     * @return the Location value object
     */
    public static Location of(String address, Coordinates coordinates) {
        if (Objects.isNull(address) && Objects.isNull(coordinates)) {
            return null;
        }
        return new Location(address, coordinates);
    }

    /**
     * Creates a Location with only address.
     *
     * @param address the physical address
     * @return the Location value object
     */
    public static Location ofAddress(String address) {
        return new Location(address, null);
    }

    /**
     * Creates a Location with only coordinates.
     *
     * @param coordinates the geographic coordinates
     * @return the Location value object
     */
    public static Location ofCoordinates(Coordinates coordinates) {
        return new Location(null, coordinates);
    }

    /**
     * Gets the address.
     *
     * @return the physical address
     */
    public String getAddress() {
        return address;
    }

    /**
     * Gets the coordinates.
     *
     * @return the geographic coordinates
     */
    public Coordinates getCoordinates() {
        return coordinates;
    }

    /**
     * Checks if this location has coordinates.
     *
     * @return true if coordinates are present
     */
    public boolean hasCoordinates() {
        return Objects.nonNull(coordinates);
    }

    /**
     * Checks if this location has an address.
     *
     * @return true if address is present
     */
    public boolean hasAddress() {
        return Objects.nonNull(address) && !address.isBlank();
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{address, coordinates};
    }

    @Override
    public String toString() {
        if (hasAddress() && hasCoordinates()) {
            return String.format("%s %s", address, coordinates);
        } else if (hasAddress()) {
            return address;
        } else if (hasCoordinates()) {
            return coordinates.toString();
        }
        return "Unknown location";
    }
}

