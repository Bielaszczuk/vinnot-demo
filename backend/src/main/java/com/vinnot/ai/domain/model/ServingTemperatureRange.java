package com.vinnot.ai.domain.model;

import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The serving temperature range in degrees Celsius, read from the first Celsius value of a serving line:
 * "16–18 °C", "16 a 18 °C" and "entre 16 y 18 grados" give 16 to 18; a single "8 °C" gives 8 to 8. Fahrenheit
 * values and numbers without a Celsius unit ("decantar 30-60 minutos") are not temperatures.
 */
public record ServingTemperatureRange(int min, int max) {

    private static final String CELSIUS = "(?:\\s*[°º]\\s*c\\b|\\s*[°º](?!\\s*f)|\\s*c\\b|\\s*grados\\b)";
    private static final String SEPARATOR = "\\s*(?:-|–|—|\\ba\\b|\\bal\\b|\\bto\\b|\\by\\b|\\band\\b)\\s*";
    private static final Pattern READING = Pattern.compile("\\b(?:" + degrees("from") + CELSIUS + "?" + SEPARATOR
            + degrees("to") + "|" + degrees("single") + ")" + CELSIUS);

    public ServingTemperatureRange {
        if (min > max) {
            throw new IllegalArgumentException("Serving temperature minimum must not exceed its maximum");
        }
    }

    public static Optional<ServingTemperatureRange> fromDescription(String temperature) {
        if (Objects.isNull(temperature) || temperature.isBlank()) {
            return Optional.empty();
        }
        Matcher reading = READING.matcher(TastingText.normalized(temperature));
        if (!reading.find()) {
            return Optional.empty();
        }
        if (Objects.nonNull(reading.group("single"))) {
            int single = rounded(reading.group("single"));
            return Optional.of(new ServingTemperatureRange(single, single));
        }
        int from = rounded(reading.group("from"));
        int to = rounded(reading.group("to"));
        return Optional.of(new ServingTemperatureRange(Math.min(from, to), Math.max(from, to)));
    }

    /** A named group for a one- or two-digit Celsius value, decimals allowed ("7,5"). */
    private static String degrees(String name) {
        return "(?<" + name + ">\\d{1,2}(?:[.,]\\d+)?)";
    }

    private static int rounded(String value) {
        return (int) Math.round(Double.parseDouble(value.replace(',', '.')));
    }
}
