package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.port.in.GetAdminReviewByIdUseCase;
import com.vinnot.admin.application.port.in.SearchAdminReviewsUseCase;
import com.vinnot.admin.application.query.model.GetAdminReviewByIdQuery;
import com.vinnot.admin.application.query.model.SearchAdminReviewsQuery;
import com.vinnot.admin.application.query.response.ReviewAdminResponse;
import com.vinnot.review.application.command.model.DeleteReviewCommand;
import com.vinnot.review.application.port.in.DeleteReviewUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import com.vinnot.shared.infrastructure.web.dto.MutationResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/reviews")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@Tag(name = "Admin - Reviews", description = "Admin review moderation endpoints")
@RequiredArgsConstructor
public class ReviewAdminController {

    private final SearchAdminReviewsUseCase searchUseCase;
    private final GetAdminReviewByIdUseCase getByIdUseCase;
    private final DeleteReviewUseCase deleteUseCase;

    @GetMapping
    @Operation(summary = "List all reviews (admin)")
    public ResponseEntity<PageResult<ReviewAdminResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageResult<ReviewAdminResponse> response = searchUseCase.execute(
                new SearchAdminReviewsQuery(search, page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get review by ID (admin)")
    public ResponseEntity<ReviewAdminResponse> getById(@PathVariable UUID id) {
        ReviewAdminResponse response = getByIdUseCase.execute(new GetAdminReviewByIdQuery(id));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete review (admin)")
    public ResponseEntity<MutationResponse> delete(@PathVariable UUID id) {
        deleteUseCase.execute(new DeleteReviewCommand(id, null, true));
        return ResponseEntity.ok(MutationResponse.of(id, "Review deleted successfully"));
    }
}
