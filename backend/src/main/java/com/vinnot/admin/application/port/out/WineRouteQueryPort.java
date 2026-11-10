package com.vinnot.admin.application.port.out;

public interface WineRouteQueryPort {

    /**
     * Counts total routes.
     *
     * @return the total count
     */
    long count();

    /**
     * Counts published routes.
     *
     * @return the count of published routes
     */
    long countPublished();
}
