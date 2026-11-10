package com.vinnot.admin.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A mobile app version, {@code major.minor.patch}, each part an integer from 0 to 9999 (#428). Versions compare
 * numerically part by part, so {@code 0.10.0} is newer than {@code 0.9.9}.
 */
public record AppVersion(int major, int minor, int patch) implements Comparable<AppVersion> {
    private static final int MAX_PART = 9999;
    private static final Pattern FORMAT = Pattern.compile(
            "(?<major>[0-9]{1,4})\\.(?<minor>[0-9]{1,4})\\.(?<patch>[0-9]{1,4})");
    private static final Comparator<AppVersion> ORDER = Comparator.comparingInt(AppVersion::major)
            .thenComparingInt(AppVersion::minor).thenComparingInt(AppVersion::patch);

    public AppVersion {
        if (outOfRange(major) || outOfRange(minor) || outOfRange(patch)) {
            throw invalid();
        }
    }

    /** Parses {@code major.minor.patch}; any other text, or no text, is refused with {@code INVALID_APP_VERSION}. */
    public static AppVersion parse(String value) {
        if (Objects.isNull(value)) {
            throw invalid();
        }
        Matcher parts = FORMAT.matcher(value);
        if (!parts.matches()) {
            throw invalid();
        }
        return new AppVersion(Integer.parseInt(parts.group("major")), Integer.parseInt(parts.group("minor")),
                Integer.parseInt(parts.group("patch")));
    }

    /** No value means no version; a value must be a valid version. */
    public static Optional<AppVersion> parseOptional(String value) {
        return Optional.ofNullable(value).map(AppVersion::parse);
    }

    public boolean isOlderThan(AppVersion other) {
        return compareTo(other) < 0;
    }

    @Override
    public int compareTo(AppVersion other) {
        return ORDER.compare(this, other);
    }

    @Override
    public String toString() {
        return major + "." + minor + "." + patch;
    }

    private static boolean outOfRange(int part) {
        return part < 0 || part > MAX_PART;
    }

    private static DomainException invalid() {
        return new DomainException("INVALID_APP_VERSION", "Use major.minor.patch, three numbers from 0 to 9999, such as 0.3.0");
    }
}
