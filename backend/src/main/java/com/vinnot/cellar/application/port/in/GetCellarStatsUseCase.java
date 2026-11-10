package com.vinnot.cellar.application.port.in;

import com.vinnot.cellar.application.query.model.GetCellarStatsQuery;
import com.vinnot.cellar.application.query.response.CellarStatsResponse;

public interface GetCellarStatsUseCase {

    CellarStatsResponse execute(GetCellarStatsQuery query);
}

