package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.GetMyEventRegistrationQuery;
import com.vinnot.event.application.query.response.EventRegistrationResponse;

public interface GetMyEventRegistrationUseCase {

    EventRegistrationResponse execute(GetMyEventRegistrationQuery query);
}
