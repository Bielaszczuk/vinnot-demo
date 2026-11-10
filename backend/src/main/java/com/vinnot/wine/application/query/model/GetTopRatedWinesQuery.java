package com.vinnot.wine.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

/**
 * Query to get top rated wines.
 *
 * @param page the page number
 * @param size the page size
 */
public record GetTopRatedWinesQuery(int page, int size) implements Query<PageResult<WineSummaryResponse>> {
}

