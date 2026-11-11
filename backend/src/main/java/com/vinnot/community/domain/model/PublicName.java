package com.vinnot.community.domain.model;

import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** The name other members see: the first and last name when given, otherwise the username. */
public final class PublicName {
    private PublicName() {
    }

    public static String of(String username, String firstName, String lastName) {
        String name = Stream.of(firstName, lastName)
                .filter(part -> Objects.nonNull(part) && !part.isBlank())
                .map(String::trim)
                .collect(Collectors.joining(" "));
        return name.isEmpty() ? username : name;
    }
}
