package com.vinnot.shared.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

/** Trusted caller context supplied by an authentication adapter, never by request data. */
public record ResourceReader(UUID userId, boolean catalogStaff) {
    public static ResourceReader anonymous() {
        return new ResourceReader(null, false);
    }

    public static ResourceReader staff() {
        return new ResourceReader(null, true);
    }

    public boolean mayRead(boolean publiclyVisible, UUID ownerId) {
        return publiclyVisible || catalogStaff || (Objects.nonNull(userId) && userId.equals(ownerId));
    }
}
