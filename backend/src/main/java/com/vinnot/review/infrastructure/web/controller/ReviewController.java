package com.vinnot.review.infrastructure.web.controller;

import com.vinnot.review.application.command.model.CreateReviewCommand;
import com.vinnot.review.application.command.model.DeleteReviewCommand;
import com.vinnot.review.application.command.model.LikeReviewCommand;
import com.vinnot.review.application.command.model.UnlikeReviewCommand;
import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.command.model.AddReviewCommentCommand;
import com.vinnot.review.application.command.model.DeleteReviewCommentCommand;
import com.vinnot.review.application.port.in.CreateReviewUseCase;
import com.vinnot.review.application.port.in.UpdateReviewUseCase;
import com.vinnot.review.application.port.in.DeleteReviewUseCase;
import com.vinnot.review.application.port.in.LikeReviewUseCase;
import com.vinnot.review.application.port.in.UnlikeReviewUseCase;
import com.vinnot.review.application.port.in.AddReviewCommentUseCase;
import com.vinnot.review.application.port.in.DeleteReviewCommentUseCase;
import com.vinnot.review.application.port.in.GetReviewsByWineUseCase;
import com.vinnot.review.application.port.in.CheckUserReviewUseCase;
import com.vinnot.review.application.port.in.GetReviewCommentsUseCase;
import com.vinnot.review.application.query.model.GetReviewsByWineQuery;
import com.vinnot.review.application.query.model.GetReviewCommentsQuery;
import com.vinnot.review.application.query.response.ReviewCommentResponse;
import com.vinnot.review.application.query.response.ReviewResponse;
import com.vinnot.review.infrastructure.web.request.AddReviewCommentRequest;
import com.vinnot.review.infrastructure.web.request.CreateReviewRequest;
import com.vinnot.review.infrastructure.web.request.UpdateReviewRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/wines/{wineId}/reviews")
@Tag(name = "Reviews", description = "Wine review management endpoints")
@RequiredArgsConstructor
public class ReviewController {

    private final CreateReviewUseCase createReviewUseCase;
    private final UpdateReviewUseCase updateReviewUseCase;
    private final DeleteReviewUseCase deleteReviewUseCase;
    private final LikeReviewUseCase likeReviewUseCase;
    private final UnlikeReviewUseCase unlikeReviewUseCase;
    private final AddReviewCommentUseCase addReviewCommentUseCase;
    private final DeleteReviewCommentUseCase deleteReviewCommentUseCase;
    private final GetReviewsByWineUseCase getReviewsByWineUseCase;
    private final CheckUserReviewUseCase checkUserReviewUseCase;
    private final GetReviewCommentsUseCase getReviewCommentsUseCase;

    /**
     * Gets reviews for a wine, paginated.
     *
     * @param wineId    the wine ID
     * @param page      the page number
     * @param size      the page size
     * @param filter    sort filter (e.g. "recent")
     * @param principal the authenticated user (nullable for anonymous)
     * @return page of reviews
     */
    @GetMapping
    @Operation(summary = "Get reviews for a wine")
    public ResponseEntity<PageResult<ReviewResponse>> getByWine(
            @PathVariable UUID wineId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "recent") String filter,
            @AuthenticationPrincipal String principal) {

        UUID currentUserId = resolveOptionalUserId(principal);
        PageResult<ReviewResponse> response = getReviewsByWineUseCase.execute(
                new GetReviewsByWineQuery(wineId, page, size, filter, currentUserId)
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Checks if the current user has already reviewed this wine.
     *
     * @param wineId    the wine ID
     * @param principal the authenticated user
     * @return true/false with review id if exists
     */
    @GetMapping("/mine")
    @Operation(summary = "Check if current user has reviewed this wine")
    public ResponseEntity<Map<String, Object>> checkMyReview(
            @PathVariable UUID wineId,
            @AuthenticationPrincipal String principal) {

        UUID userId = resolveOptionalUserId(principal);
        if (Objects.isNull(userId)) {
            return ResponseEntity.ok(Map.of("hasReview", false));
        }

        boolean exists = checkUserReviewUseCase.execute(wineId, userId);
        return ResponseEntity.ok(Map.of("hasReview", exists));
    }

    /**
     * Creates a new review for a wine. UserId is taken from JWT.
     *
     * @param wineId    the wine ID
     * @param principal the authenticated user
     * @param request   the review data
     * @return created review
     */
    @PostMapping
    @PreAuthorize("hasAuthority('REVIEW_CREATE')")
    @Operation(summary = "Create a new review")
    public ResponseEntity<ReviewResponse> create(
            @PathVariable UUID wineId,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateReviewRequest request) {

        UUID userId = UUID.fromString(principal);
        CreateReviewCommand command = new CreateReviewCommand(
                wineId,
                userId,
                request.rating(),
                request.title(),
                request.comment(),
                request.vintage()
        );

        ReviewResponse response = createReviewUseCase.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Updates a review.
     *
     * @param wineId  the wine ID (from path)
     * @param id      the review ID
     * @param request the update data
     * @return updated review
     */
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('REVIEW_UPDATE_OWN') or hasRole('ADMIN')")
    @Operation(summary = "Update a review")
    public ResponseEntity<ReviewResponse> update(
            @PathVariable UUID wineId,
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            Authentication authentication,
            @Valid @RequestBody UpdateReviewRequest request) {

        UpdateReviewCommand command = new UpdateReviewCommand(
                id,
                UUID.fromString(principal),
                AuthorizationUtils.hasAuthority(authentication, "ROLE_ADMIN"),
                request.rating(),
                request.title(),
                request.comment(),
                request.vintage(),
                Boolean.TRUE.equals(request.clearVintage())
        );

        ReviewResponse response = updateReviewUseCase.execute(command);
        return ResponseEntity.ok(response);
    }

    /**
     * Deletes a review.
     *
     * @param wineId the wine ID (from path)
     * @param id     the review ID
     * @return success message
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('REVIEW_DELETE') or hasAuthority('REVIEW_DELETE_OWN')")
    @Operation(summary = "Delete a review")
    public ResponseEntity<MutationResponse> delete(
            @PathVariable UUID wineId,
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            Authentication authentication) {

        deleteReviewUseCase.execute(new DeleteReviewCommand(
                id,
                UUID.fromString(principal),
                AuthorizationUtils.hasAuthority(authentication, "REVIEW_DELETE")));
        return ResponseEntity.ok(MutationResponse.of(id, "Review deleted successfully"));
    }

    /**
     * Likes a review. UserId is taken from JWT.
     *
     * @param wineId    the wine ID (from path)
     * @param id        the review ID
     * @param principal the authenticated user
     * @return success message
     */
    @PostMapping("/{id}/like")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Like a review")
    public ResponseEntity<MutationResponse> like(
            @PathVariable UUID wineId,
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal) {

        UUID userId = UUID.fromString(principal);
        likeReviewUseCase.execute(new LikeReviewCommand(id, userId));
        return ResponseEntity.ok(MutationResponse.message("Review liked successfully"));
    }

    /**
     * Unlikes a review. UserId is taken from JWT.
     *
     * @param wineId    the wine ID (from path)
     * @param id        the review ID
     * @param principal the authenticated user
     * @return success message
     */
    @DeleteMapping("/{id}/like")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Unlike a review")
    public ResponseEntity<MutationResponse> unlike(
            @PathVariable UUID wineId,
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal) {

        UUID userId = UUID.fromString(principal);
        unlikeReviewUseCase.execute(new UnlikeReviewCommand(id, userId));
        return ResponseEntity.ok(MutationResponse.message("Review unliked successfully"));
    }

    /**
     * Gets comments for a review.
     *
     * @param wineId the wine ID (from path)
     * @param id     the review ID
     * @return list of comments
     */
    @GetMapping("/{id}/comments")
    @Operation(summary = "Get comments for a review")
    public ResponseEntity<List<ReviewCommentResponse>> getComments(
            @PathVariable UUID wineId,
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal) {

        List<ReviewCommentResponse> comments =
                getReviewCommentsUseCase.execute(new GetReviewCommentsQuery(id, resolveOptionalUserId(principal)));
        return ResponseEntity.ok(comments);
    }

    /**
     * Adds a comment to a review. UserId is taken from JWT.
     *
     * @param wineId    the wine ID (from path)
     * @param id        the review ID
     * @param principal the authenticated user
     * @param request   the comment data
     * @return the created comment
     */
    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add a comment to a review")
    public ResponseEntity<ReviewCommentResponse> addComment(
            @PathVariable UUID wineId,
            @PathVariable UUID id,
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody AddReviewCommentRequest request) {

        UUID userId = UUID.fromString(principal);
        ReviewCommentResponse response =
                addReviewCommentUseCase.execute(new AddReviewCommentCommand(id, userId, request.content()));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Deletes a comment from a review. UserId is taken from JWT.
     *
     * @param wineId    the wine ID (from path)
     * @param id        the review ID
     * @param commentId the comment ID
     * @param principal the authenticated user
     * @return success message
     */
    @DeleteMapping("/{id}/comments/{commentId}")
    @PreAuthorize("hasAuthority('REVIEW_DELETE') or hasAuthority('REVIEW_DELETE_OWN')")
    @Operation(summary = "Delete a comment from a review")
    public ResponseEntity<MutationResponse> deleteComment(
            @PathVariable UUID wineId,
            @PathVariable UUID id,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal String principal,
            Authentication authentication) {

        UUID userId = UUID.fromString(principal);
        deleteReviewCommentUseCase.execute(new DeleteReviewCommentCommand(
                commentId,
                userId,
                AuthorizationUtils.hasAuthority(authentication, "REVIEW_DELETE")));
        return ResponseEntity.ok(MutationResponse.message("Comment deleted successfully"));
    }

    private UUID resolveOptionalUserId(String principal) {
        if (Objects.isNull(principal)) {
            return null;
        }

        try {
            return UUID.fromString(principal);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
