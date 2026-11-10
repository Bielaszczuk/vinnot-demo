package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.ConfirmEventAttendanceCommand;
import com.vinnot.event.application.query.response.EventRegistrationResponse;

public interface ConfirmEventAttendanceUseCase {

    EventRegistrationResponse execute(ConfirmEventAttendanceCommand command);
}
