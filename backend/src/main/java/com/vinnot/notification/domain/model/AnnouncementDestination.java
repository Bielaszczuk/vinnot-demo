package com.vinnot.notification.domain.model;

/** Where a pushed announcement opens the app (#310), chosen from these screens. */
public enum AnnouncementDestination {
    HOME("/"),
    EVENTS("/events"),
    WINES("/wines"),
    WINE_ROUTES("/wine-routes"),
    WINERIES("/wineries");

    private final String route;

    AnnouncementDestination(String route) {
        this.route = route;
    }

    public String route() {
        return route;
    }
}
