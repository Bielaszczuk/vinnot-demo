package com.vinnot.community.infrastructure.web;

import com.vinnot.community.application.command.model.ChangeUserBlockCommand;
import com.vinnot.community.application.command.model.CreateReportCommand;
import com.vinnot.community.application.port.in.ChangeUserBlockUseCase;
import com.vinnot.community.application.port.in.CreateReportUseCase;
import com.vinnot.community.application.port.in.GetCommunityUseCase;
import com.vinnot.community.application.query.response.CommunityOverview;
import com.vinnot.community.application.query.response.ReportReceipt;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.shared.domain.valueobject.PageResult;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/community")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class CommunityController {
    private final CreateReportUseCase createReport;
    private final ChangeUserBlockUseCase changeBlock;
    private final GetCommunityUseCase queries;

    public record ReportRequest(
            @NotNull ContentTarget.Type targetType,
            @NotNull UUID targetId,
            @NotNull CommunityReport.Reason reason,
            @Size(max = 2000) String description) { }

    @PostMapping("/reports")
    public ReportReceipt report(
            @AuthenticationPrincipal String principal, @Valid @RequestBody ReportRequest request) {
        return createReport.execute(
                new CreateReportCommand(
                        UUID.fromString(principal),
                        new ContentTarget(request.targetType(), request.targetId()),
                        request.reason(),
                        request.description()));
    }

    @GetMapping("/overview")
    public CommunityOverview overview(@AuthenticationPrincipal String principal) {
        return queries.overview(UUID.fromString(principal));
    }

    @GetMapping("/reports/mine")
    public PageResult<ReportReceipt> reports(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queries.reports(UUID.fromString(principal), page, size);
    }

    @GetMapping("/blocks")
    public ResponseEntity<?> blocks(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(queries.blocks(UUID.fromString(principal), page, size));
    }

    @PutMapping("/blocks/{userId}")
    public ResponseEntity<Void> block(
            @AuthenticationPrincipal String principal, @PathVariable UUID userId) {
        changeBlock.execute(new ChangeUserBlockCommand(UUID.fromString(principal), userId, true));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/blocks/{userId}")
    public ResponseEntity<Void> unblock(
            @AuthenticationPrincipal String principal, @PathVariable UUID userId) {
        changeBlock.execute(new ChangeUserBlockCommand(UUID.fromString(principal), userId, false));
        return ResponseEntity.noContent().build();
    }
}
