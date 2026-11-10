package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.query.model.GetWineHighlightsQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

import java.util.List;

public interface GetWineHighlightsUseCase {
    List<WineSummaryResponse> execute(GetWineHighlightsQuery query);
}
