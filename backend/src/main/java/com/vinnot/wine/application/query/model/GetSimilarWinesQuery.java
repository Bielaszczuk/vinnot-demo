package com.vinnot.wine.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

import java.util.List;
import java.util.UUID;

public record GetSimilarWinesQuery(UUID wineId, int limit) implements Query<List<WineSummaryResponse>> {
}

