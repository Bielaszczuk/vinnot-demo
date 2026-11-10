package com.vinnot.community.infrastructure.web;

import com.vinnot.community.application.command.model.ReviewReportCommand;
import com.vinnot.community.application.port.in.GetCommunityUseCase;
import com.vinnot.community.application.port.in.RemoveReportedContentUseCase;
import com.vinnot.community.application.port.in.ReviewReportUseCase;
import com.vinnot.community.application.query.response.ModerationReport;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ReportCounts;
import com.vinnot.shared.domain.valueobject.PageResult;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/community/reports")
@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
@RequiredArgsConstructor
public class CommunityModerationController {
    private final GetCommunityUseCase queries;
    private final ReviewReportUseCase review;
    private final RemoveReportedContentUseCase removal;

    public record DecisionRequest(
            @NotNull CommunityReport.Status status, @Size(max = 2000) String decision) { }

    @GetMapping("/overview")
    public ReportCounts overview(@AuthenticationPrincipal String principal) {
        return queries.moderationOverview(UUID.fromString(principal));
    }

    @GetMapping
    public PageResult<ModerationReport> list(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "OPEN") CommunityReport.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queries.moderation(UUID.fromString(principal), status, page, size);
    }

    @PatchMapping("/{id}")
    public CommunityReport review(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID id,
            @Valid @RequestBody DecisionRequest request) {
        return review.execute(
                new ReviewReportCommand(
                        id, UUID.fromString(principal), request.status(), request.decision()));
    }

    @PostMapping("/{id}/remove-content")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR') and hasAuthority('REVIEW_DELETE')")
    public CommunityReport removeContent(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID id,
            @Valid @RequestBody DecisionRequest request) {
        return removal.execute(
                new ReviewReportCommand(
                        id,
                        UUID.fromString(principal),
                        CommunityReport.Status.RESOLVED,
                        request.decision()));
    }
}
