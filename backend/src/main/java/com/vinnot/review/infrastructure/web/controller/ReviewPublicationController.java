package com.vinnot.review.infrastructure.web.controller;

import com.vinnot.review.application.command.model.DecideReviewPublicationCommand;
import com.vinnot.review.application.port.in.DecideReviewPublicationUseCase;
import com.vinnot.review.application.port.in.GetReviewPublicationQueueUseCase;
import com.vinnot.review.application.query.response.ReviewPublicationQueueItem;
import com.vinnot.review.domain.model.PublicationRejectionReason;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.shared.domain.valueobject.PageResult;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/admin/review-publications")
@PreAuthorize("hasAnyRole('ADMIN','MODERATOR') and hasAuthority('REVIEW_DELETE')")
@RequiredArgsConstructor
public class ReviewPublicationController {
    private final GetReviewPublicationQueueUseCase queue;
    private final DecideReviewPublicationUseCase decide;

    public record DecisionRequest(
            @NotNull PublicationStatus status,
            PublicationRejectionReason reasonCode,
            @Size(max = 2000) String reason,
            @NotNull Instant expectedRevision) { }

    @GetMapping
    public PageResult<ReviewPublicationQueueItem> pending(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queue.execute(UUID.fromString(principal), page, size);
    }

    @PostMapping("/{type}/{id}")
    public void decide(
            @AuthenticationPrincipal String principal,
            @PathVariable ReviewPublication.Type type,
            @PathVariable UUID id,
            @Valid @RequestBody DecisionRequest request) {
        decide.execute(
                new DecideReviewPublicationCommand(
                        type,
                        id,
                        UUID.fromString(principal),
                        request.status(),
                        request.reasonCode(),
                        request.reason(),
                        request.expectedRevision()));
    }
}
