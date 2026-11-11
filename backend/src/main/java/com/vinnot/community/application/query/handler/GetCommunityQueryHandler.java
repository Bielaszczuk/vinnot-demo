package com.vinnot.community.application.query.handler;

import com.vinnot.community.application.port.in.GetCommunityUseCase;
import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.application.port.out.CommunityTargetPort;
import com.vinnot.community.application.port.out.CommunityTargetPort.ModerationNames;
import com.vinnot.community.application.port.out.UserBlockRepositoryPort;
import com.vinnot.community.application.port.out.UserBlockRepositoryPort.BlockedUser;
import com.vinnot.community.application.query.response.CommunityOverview;
import com.vinnot.community.application.query.response.ModerationReport;
import com.vinnot.community.application.query.response.ReportReceipt;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ReportCounts;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetCommunityQueryHandler implements GetCommunityUseCase {
    private static final ModerationNames NO_NAMES = new ModerationNames(Map.of(), Map.of());
    private final CommunityReportRepositoryPort reports;
    private final UserBlockRepositoryPort blocks;
    private final CommunityTargetPort targets;

    @Override
    public CommunityOverview overview(UUID userId) {
        return new CommunityOverview(reports.countMine(userId), blocks.countBlocked(userId));
    }

    @Override
    public ReportCounts moderationOverview(UUID reviewer) {
        return reports.countForModeration(reviewer);
    }

    @Override
    public PageResult<ReportReceipt> reports(UUID userId, int page, int size) {
        return reports.findMine(userId, PageQuery.bounded(page, size, 50)).map(ReportReceipt::from);
    }

    @Override
    public PageResult<BlockedUser> blocks(UUID userId, int page, int size) {
        return blocks.findBlocked(userId, PageQuery.bounded(page, size, 50));
    }

    @Override
    public PageResult<ModerationReport> moderation(
            UUID reviewer, CommunityReport.Status status, int page, int size) {
        PageResult<CommunityReport> found =
                reports.findForModeration(reviewer, status, PageQuery.bounded(page, size, 50));
        if (found.content().isEmpty()) {
            return found.map(report -> ModerationReport.from(report, NO_NAMES));
        }
        Set<UUID> users = new HashSet<>();
        found.content().forEach(report -> {
            users.add(report.authorId());
            users.add(report.reviewerId());
        });
        users.remove(null);
        ModerationNames names =
                targets.describe(
                        found.content().stream()
                                .flatMap(report -> Stream.concat(
                                        Stream.of(report.target()),
                                        ModerationReport.relatedTarget(report).stream()))
                                .collect(Collectors.toSet()),
                        users);
        return found.map(report -> ModerationReport.from(report, names));
    }
}
