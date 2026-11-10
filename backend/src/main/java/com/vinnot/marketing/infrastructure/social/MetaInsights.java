package com.vinnot.marketing.infrastructure.social;

import tools.jackson.databind.JsonNode;

import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Reads a Meta insights answer (#510): {@code data[]} entries with a {@code name} and the number in
 * {@code values[0].value} (or {@code total_value.value} when Meta answers with a breakdown). A value that is an object,
 * like reactions by type, counts as the sum of its numbers. Metrics Meta leaves out are simply absent.
 */
final class MetaInsights {

    private MetaInsights() {
    }

    static Map<String, Long> values(JsonNode answer) {
        Map<String, Long> values = new HashMap<>();
        for (JsonNode metric : answer.path("data")) {
            JsonNode value = metric.path("values").path(0).path("value");
            if (value.isMissingNode()) {
                value = metric.path("total_value").path("value");
            }
            Long number = number(value);
            if (Objects.nonNull(number)) {
                values.put(metric.path("name").asText(""), number);
            }
        }
        return values;
    }

    /** Adds up the given values, null when none of them is there. */
    static Long sum(Long... values) {
        return Stream.of(values).filter(Objects::nonNull).reduce(Long::sum).orElse(null);
    }

    private static Long number(JsonNode value) {
        if (value.isNumber()) {
            return value.asLong();
        }
        if (value.isObject()) {
            return value.properties().stream().map(Entry::getValue).filter(JsonNode::isNumber)
                    .mapToLong(JsonNode::asLong).sum();
        }
        return null;
    }
}
