package com.vinnot.user.domain.valueobject;

public enum Role {

    /**
     * Standard user role.
     */
    USER,

    /**
     * Administrator role with elevated privileges.
     */
    ADMIN,

    /**
     * Content moderator role.
     */
    MODERATOR,

    /**
     * Partner/Winery owner role.
     */
    PARTNER
}

