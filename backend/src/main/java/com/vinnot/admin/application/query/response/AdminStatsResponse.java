package com.vinnot.admin.application.query.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AdminStatsResponse(
        long totalUsers,
        long totalWines,
        long totalWineries,
        long totalEvents,
        long totalReviews,
        long totalRoutes,
        long activeUsers,
        long publishedEvents,
        long publishedRoutes
) {
    @JsonProperty("users")
    public long users() {
        return totalUsers;
    }

    @JsonProperty("wines")
    public long wines() {
        return totalWines;
    }

    @JsonProperty("wineries")
    public long wineries() {
        return totalWineries;
    }

    @JsonProperty("events")
    public long events() {
        return totalEvents;
    }

    @JsonProperty("reviews")
    public long reviews() {
        return totalReviews;
    }

    @JsonProperty("routes")
    public long routes() {
        return totalRoutes;
    }
}

