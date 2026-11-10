package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.GetEventRegistrationsQuery;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface GetEventRegistrationsUseCase {

    PageResult<EventRegistrationResponse> execute(GetEventRegistrationsQuery query);
}
