package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;

/**
 * Value object representing a temperature range for wine serving.
 */
public final class ServingTemperature extends ValueObject {

    private static final int MIN_TEMP = 0;
    private static final int MAX_TEMP = 25;

    private final Integer minTemp;
    private final Integer maxTemp;

    private ServingTemperature(Integer minTemp, Integer maxTemp) {
        validate(minTemp, maxTemp);
        this.minTemp = minTemp;
        this.maxTemp = maxTemp;
    }

    /**
     * Creates a ServingTemperature range.
     *
     * @param minTemp the minimum serving temperature in Celsius
     * @param maxTemp the maximum serving temperature in Celsius
     * @return the ServingTemperature value object
     */
    public static ServingTemperature of(Integer minTemp, Integer maxTemp) {
        if (Objects.isNull(minTemp) && Objects.isNull(maxTemp)) {
            return null;
        }
        return new ServingTemperature(minTemp, maxTemp);
    }

    private void validate(Integer min, Integer max) {
        if (Objects.nonNull(min) && (min < MIN_TEMP || min > MAX_TEMP)) {
            throw new DomainException("INVALID_TEMPERATURE",
                    String.format("Temperature must be between %d and %d°C", MIN_TEMP, MAX_TEMP));
        }
        if (Objects.nonNull(max) && (max < MIN_TEMP || max > MAX_TEMP)) {
            throw new DomainException("INVALID_TEMPERATURE",
                    String.format("Temperature must be between %d and %d°C", MIN_TEMP, MAX_TEMP));
        }
        if (Objects.nonNull(min) && Objects.nonNull(max) && min > max) {
            throw new DomainException("INVALID_TEMPERATURE_RANGE",
                    "Minimum temperature cannot be greater than maximum");
        }
    }

    /**
     * Gets the minimum serving temperature.
     *
     * @return the minimum temperature in Celsius
     */
    public Integer getMinTemp() {
        return minTemp;
    }

    /**
     * Gets the maximum serving temperature.
     *
     * @return the maximum temperature in Celsius
     */
    public Integer getMaxTemp() {
        return maxTemp;
    }

    /**
     * Gets a formatted display string.
     *
     * @return temperature range as string
     */
    public String getDisplayRange() {
        if (Objects.nonNull(minTemp) && Objects.nonNull(maxTemp)) {
            return String.format("%d-%d°C", minTemp, maxTemp);
        } else if (Objects.nonNull(minTemp)) {
            return String.format("%d°C+", minTemp);
        } else if (Objects.nonNull(maxTemp)) {
            return String.format("Up to %d°C", maxTemp);
        }
        return "N/A";
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{minTemp, maxTemp};
    }

    @Override
    public String toString() {
        return getDisplayRange();
    }
}

