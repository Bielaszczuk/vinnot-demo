package com.vinnot.wine.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public record GetRecentWinesQuery(int page, int size) implements Query<PageResult<WineSummaryResponse>> {
}

