package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.model.PlanResult;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.model.WineDayResponse;
import com.vinnot.marketing.application.port.in.BrowseSocialPostsUseCase;
import com.vinnot.marketing.application.port.in.PlanWeekUseCase;
import com.vinnot.marketing.application.port.in.RetrySocialPublicationUseCase;
import com.vinnot.marketing.application.port.in.ReviewSocialPostUseCase;
import com.vinnot.marketing.application.port.in.ScheduleSocialPostUseCase;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.infrastructure.web.dto.EditSocialPostRequest;
import com.vinnot.marketing.infrastructure.web.dto.RejectSocialPostRequest;
import com.vinnot.marketing.infrastructure.web.dto.RescheduleSocialPostRequest;
import com.vinnot.shared.domain.valueobject.PageResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * The social media agent's approval queue (#489), its publications (#510) and the schedule actions (#513: reschedule and
 * publish now), administrators only.
 */
@RestController
@RequestMapping("/admin/social-posts")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Social posts", description = "Weekly social post planning and approval")
@RequiredArgsConstructor
public class SocialPostAdminController {
    private final BrowseSocialPostsUseCase browse;
    private final PlanWeekUseCase plan;
    private final ReviewSocialPostUseCase review;
    private final RetrySocialPublicationUseCase retry;
    private final ScheduleSocialPostUseCase schedule;

    @GetMapping
    @Operation(summary = "List social posts by status and date (admin)")
    public ResponseEntity<PageResult<SocialPostAdminResponse>> list(@RequestParam(required = false) SocialPostStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(browse.search(status, from, to, page, size));
    }

    @GetMapping("/wine-days")
    @Operation(summary = "Wine-day calendar of a year (admin)")
    public ResponseEntity<List<WineDayResponse>> wineDays(@RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(browse.wineDays(Objects.isNull(year) ? Year.now().getValue() : year));
    }

    @GetMapping("/pillars")
    @Operation(summary = "Content pillars (admin)")
    public ResponseEntity<List<ContentPillarResponse>> pillars() {
        return ResponseEntity.ok(browse.pillars());
    }

    @PostMapping("/plan")
    @Operation(summary = "Plan the next two weeks now (admin)")
    public ResponseEntity<PlanResult> plan() {
        return ResponseEntity.ok(plan.execute(Instant.now()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a social post (admin)")
    public ResponseEntity<SocialPostAdminResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(browse.get(id));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve a pending social post (admin)")
    public ResponseEntity<SocialPostAdminResponse> approve(@PathVariable UUID id, @AuthenticationPrincipal String principal) {
        return ResponseEntity.ok(review.approve(id, UUID.fromString(principal), Instant.now()));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject a social post with an optional reason (admin)")
    public ResponseEntity<SocialPostAdminResponse> reject(@PathVariable UUID id, @AuthenticationPrincipal String principal,
            @RequestBody(required = false) RejectSocialPostRequest request) {
        String reason = Objects.isNull(request) ? null : request.reason();
        return ResponseEntity.ok(review.reject(id, UUID.fromString(principal), reason, Instant.now()));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace the copy of one language (es or en) of a social post (admin)")
    public ResponseEntity<SocialPostAdminResponse> edit(@PathVariable UUID id, @AuthenticationPrincipal String principal,
            @RequestBody EditSocialPostRequest request) {
        return ResponseEntity.ok(review.edit(id, request.toCommand(), UUID.fromString(principal), Instant.now()));
    }

    @PostMapping("/{id}/regenerate")
    @Operation(summary = "Generate the copy of a social post again (admin)")
    public ResponseEntity<SocialPostAdminResponse> regenerate(@PathVariable UUID id) {
        return ResponseEntity.ok(review.regenerate(id, Instant.now()));
    }

    @PostMapping("/{id}/illustration")
    @Operation(summary = "Paint a new hero illustration and render the slides again (admin)")
    public ResponseEntity<SocialPostAdminResponse> newIllustration(@PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(review.newIllustration(id, Instant.now()));
    }

    @PutMapping("/{id}/schedule")
    @Operation(summary = "Move a social post that has not started publishing to another future date and time (admin)")
    public ResponseEntity<SocialPostAdminResponse> reschedule(@PathVariable UUID id, @Valid @RequestBody RescheduleSocialPostRequest request) {
        return ResponseEntity.ok(schedule.reschedule(id, request.scheduledFor(), Instant.now()));
    }

    @PostMapping("/{id}/publish-now")
    @Operation(summary = "Publish an approved social post with ready media now on every enabled network (admin)")
    public ResponseEntity<SocialPostAdminResponse> publishNow(@PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(schedule.publishNow(id, Instant.now()));
    }

    /** {@code network} is a network name in any case ({@code instagram}, {@code TIKTOK}); another value is a bad request. */
    @PostMapping("/{id}/publications/{network}/retry")
    @Operation(summary = "Publish a post again on a network where it failed (admin)")
    public ResponseEntity<SocialPostAdminResponse> retryPublication(@PathVariable UUID id, @PathVariable String network) {
        SocialNetwork target = SocialNetwork.valueOf(network.strip().toUpperCase(Locale.ROOT));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(retry.retry(id, target, Instant.now()));
    }
}
