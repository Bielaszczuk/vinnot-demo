package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.ReviewReportCommand;
import com.vinnot.community.domain.model.CommunityReport;

public interface ReviewReportUseCase {
    CommunityReport execute(ReviewReportCommand command);
}
