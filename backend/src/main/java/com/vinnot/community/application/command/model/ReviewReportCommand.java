package com.vinnot.community.application.command.model;

import com.vinnot.community.domain.model.CommunityReport;

import java.util.UUID;

public record ReviewReportCommand(
        UUID reportId, UUID reviewerId, CommunityReport.Status status, String decision) { }
