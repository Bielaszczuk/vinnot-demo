package com.vinnot.cellar.application.port.in;

import com.vinnot.cellar.application.query.model.GetUserCellarQuery;
import com.vinnot.cellar.application.query.response.CellarWineResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface GetUserCellarUseCase {

    PageResult<CellarWineResponse> execute(GetUserCellarQuery query);
}

