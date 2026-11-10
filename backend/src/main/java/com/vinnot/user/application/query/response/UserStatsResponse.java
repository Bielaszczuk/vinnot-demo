package com.vinnot.user.application.query.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record UserStatsResponse(
        int totalReviews,
        int reviewsCount,
        int totalCellarWines,
        int cellarCount,
        int eventsAttended,
        double averageRating
) {

    @JsonProperty("total_reviews")
    public int totalReviewsSnake() {
        return totalReviews;
    }

    @JsonProperty("total_wines_tasted")
    public int totalWinesTasted() {
        return totalCellarWines;
    }

    @JsonProperty("total_events_attended")
    public int totalEventsAttended() {
        return eventsAttended;
    }

    @JsonProperty("total_routes_completed")
    public int totalRoutesCompleted() {
        return 0;
    }

    @JsonProperty("cellar_size")
    public int cellarSize() {
        return totalCellarWines;
    }

    public static UserStatsResponse of(int reviews, int cellarWines,
                                         int events, double avgRating) {
        return new UserStatsResponse(
                reviews, reviews,
                cellarWines, cellarWines,
                events, avgRating
        );
    }
}

