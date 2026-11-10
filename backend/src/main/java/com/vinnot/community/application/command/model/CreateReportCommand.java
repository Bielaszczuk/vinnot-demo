package com.vinnot.community.application.command.model;

import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;

import java.util.UUID;

public record CreateReportCommand(
        UUID reporterId, ContentTarget target, CommunityReport.Reason reason, String description) { }
