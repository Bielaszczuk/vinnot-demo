package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.GetMyEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface GetMyEventsUseCase {

    PageResult<EventSummaryResponse> execute(GetMyEventsQuery query);
}

