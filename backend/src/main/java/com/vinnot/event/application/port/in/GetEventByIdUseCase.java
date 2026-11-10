package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.GetEventByIdQuery;
import com.vinnot.event.application.query.response.EventDetailsResponse;

public interface GetEventByIdUseCase {

    EventDetailsResponse execute(GetEventByIdQuery query);
}

