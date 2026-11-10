package com.vinnot.cellar.application.query.response;

import java.util.Map;

public record CellarStatsResponse(
        int totalWines,
        int ratedWines,
        double averageRating,
        int uniqueWineries,
        int uniqueRegions,
        Map<String, Integer> byType
) {
}

