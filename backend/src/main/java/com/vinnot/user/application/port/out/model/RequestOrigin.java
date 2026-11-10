package com.vinnot.user.application.port.out.model;

/** Client address and user agent of a request; either may be null when unknown. */
public record RequestOrigin(String ipAddress, String userAgent) {
    public static final RequestOrigin UNKNOWN = new RequestOrigin(null, null);
}
