package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.ReportEventPaymentCommand;
import com.vinnot.event.application.query.response.EventRegistrationResponse;

public interface ReportEventPaymentUseCase {

    EventRegistrationResponse execute(ReportEventPaymentCommand command);
}
