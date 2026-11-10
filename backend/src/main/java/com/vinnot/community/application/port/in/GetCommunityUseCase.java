package com.vinnot.community.application.port.in;

import com.vinnot.community.application.port.out.UserBlockRepositoryPort.BlockedUser;
import com.vinnot.community.application.query.response.CommunityOverview;
import com.vinnot.community.application.query.response.ModerationReport;
import com.vinnot.community.application.query.response.ReportReceipt;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ReportCounts;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.UUID;

public interface GetCommunityUseCase {
    CommunityOverview overview(UUID userId);

    ReportCounts moderationOverview(UUID reviewer);

    PageResult<ReportReceipt> reports(UUID userId, int page, int size);

    PageResult<BlockedUser> blocks(UUID userId, int page, int size);

    PageResult<ModerationReport> moderation(
            UUID reviewer, CommunityReport.Status status, int page, int size);
}
