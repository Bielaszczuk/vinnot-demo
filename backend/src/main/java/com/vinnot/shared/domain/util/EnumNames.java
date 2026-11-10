package com.vinnot.shared.domain.util;

import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;

/** Lenient enum lookups for stored or external names, where a name this binary no longer knows is not an error. */
public final class EnumNames {

    private EnumNames() {
    }

    /** The constant of {@code type} named exactly {@code name}, or empty when there is none (or no name). */
    public static <E extends Enum<E>> Optional<E> find(Class<E> type, String name) {
        if (Objects.isNull(name)) {
            return Optional.empty();
        }
        return Arrays.stream(type.getEnumConstants()).filter(value -> value.name().equals(name)).findFirst();
    }
}
