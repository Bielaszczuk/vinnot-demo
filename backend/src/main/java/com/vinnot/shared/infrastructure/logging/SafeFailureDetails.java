package com.vinnot.shared.infrastructure.logging;

import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Objects;
import java.util.Set;
import java.util.StringJoiner;
import java.util.Arrays;

/** Diagnostic types and application locations, never exception messages or request payloads. */
public final class SafeFailureDetails {

    private static final int MAX_CAUSES = 5;

    private SafeFailureDetails() {
    }

    public static String describe(Throwable failure) {
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        StringJoiner details = new StringJoiner(" <- ");
        Throwable current = failure;
        while (Objects.nonNull(current) && seen.size() < MAX_CAUSES && seen.add(current)) {
            String location = Arrays.stream(current.getStackTrace())
                    .filter(frame -> frame.getClassName().startsWith("com.vinnot."))
                    .findFirst().map(frame -> " at " + frame).orElse("");
            details.add(current.getClass().getName() + location);
            current = current.getCause();
        }
        return details.toString();
    }
}
