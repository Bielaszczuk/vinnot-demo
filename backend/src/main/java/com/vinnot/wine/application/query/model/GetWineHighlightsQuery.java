package com.vinnot.wine.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

import java.util.List;

/** A bounded home collection, independent of catalog search and paging. */
public record GetWineHighlightsQuery(int limit) implements Query<List<WineSummaryResponse>> {
}
