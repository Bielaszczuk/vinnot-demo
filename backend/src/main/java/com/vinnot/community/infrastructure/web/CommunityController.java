package com.vinnot.community.infrastructure.web;

import com.vinnot.community.application.command.model.ChangeFollowCommand;
import com.vinnot.community.application.command.model.ChangeUserBlockCommand;
import com.vinnot.community.application.command.model.CreateReportCommand;
import com.vinnot.community.application.port.in.ChangeFollowUseCase;
import com.vinnot.community.application.port.in.ChangeUserBlockUseCase;
import com.vinnot.community.application.port.in.CreateReportUseCase;
import com.vinnot.community.application.port.in.GetCommunityUseCase;
import com.vinnot.community.application.port.in.GetSocialUseCase;
import com.vinnot.community.application.query.response.CommunityOverview;
import com.vinnot.community.application.query.response.FollowUserResponse;
import com.vinnot.community.application.query.response.ReportReceipt;
import com.vinnot.community.application.query.response.SuggestedUserResponse;
import com.vinnot.community.application.query.response.UserReviewResponse;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/community")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class CommunityController {
    private final CreateReportUseCase createReport;
    private final ChangeUserBlockUseCase changeBlock;
    private final GetCommunityUseCase queries;
    private final ChangeFollowUseCase changeFollow;
    private final GetSocialUseCase social;

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

    @PutMapping("/follows/{userId}")
    public ResponseEntity<Void> follow(
            @AuthenticationPrincipal String principal, @PathVariable UUID userId) {
        changeFollow.execute(new ChangeFollowCommand(UUID.fromString(principal), userId, true));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/follows/{userId}")
    public ResponseEntity<Void> unfollow(
            @AuthenticationPrincipal String principal, @PathVariable UUID userId) {
        changeFollow.execute(new ChangeFollowCommand(UUID.fromString(principal), userId, false));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{userId}/followers")
    public PageResult<FollowUserResponse> followers(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return social.followers(UUID.fromString(principal), userId, page, size);
    }

    @GetMapping("/users/{userId}/following")
    public PageResult<FollowUserResponse> following(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return social.following(UUID.fromString(principal), userId, page, size);
    }

    @GetMapping("/suggestions")
    public List<SuggestedUserResponse> suggestions(
            @AuthenticationPrincipal String principal, @RequestParam(defaultValue = "10") int size) {
        return social.suggestions(UUID.fromString(principal), size);
    }

    @GetMapping("/feed")
    public PageResult<UserReviewResponse> feed(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return social.feed(UUID.fromString(principal), page, size);
    }
}
