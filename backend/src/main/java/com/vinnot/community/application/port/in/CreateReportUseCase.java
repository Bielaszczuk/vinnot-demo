package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.CreateReportCommand;
import com.vinnot.community.application.query.response.ReportReceipt;

public interface CreateReportUseCase {
    ReportReceipt execute(CreateReportCommand command);
}
