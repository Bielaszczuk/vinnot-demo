package com.vinnot.community.application.query.response;

import com.vinnot.community.domain.model.ReportCounts;

public record CommunityOverview(ReportCounts reports, long blockedUsers) { }
