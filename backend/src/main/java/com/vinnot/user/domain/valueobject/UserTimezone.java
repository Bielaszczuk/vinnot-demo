package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.time.ZoneId;
import java.util.Objects;

/** IANA time zone of the user, used to show dates in their local time. */
public final class UserTimezone extends ValueObject {

    public static final UserTimezone DEFAULT = new UserTimezone("America/Argentina/Buenos_Aires");

    private final String value;

    private UserTimezone(String value) {
        this.value = value;
    }

    /**
     * Parses an IANA zone identifier such as "Europe/Madrid".
     * Raw offsets ("+03:00") and unknown identifiers are rejected.
     *
     * @param value the zone identifier
     * @return the time zone
     */
    public static UserTimezone of(String value) {
        String normalized = Objects.isNull(value) ? "" : value.trim();
        if (!ZoneId.getAvailableZoneIds().contains(normalized)) {
            throw new DomainException(
                    "INVALID_TIMEZONE", "Timezone must be a valid IANA time zone identifier");
        }
        return new UserTimezone(normalized);
    }

    public String getValue() {
        return value;
    }

    public ZoneId toZoneId() {
        return ZoneId.of(value);
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{value};
    }

    @Override
    public String toString() {
        return value;
    }
}
