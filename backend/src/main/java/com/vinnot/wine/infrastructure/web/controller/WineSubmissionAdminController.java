package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.command.model.ReviewWineSubmissionCommand;
import com.vinnot.wine.application.command.model.WineSubmissionCatalogData;
import com.vinnot.wine.application.port.in.GetWineSubmissionUseCase;
import com.vinnot.wine.application.port.in.GetWineSubmissionImageUseCase;
import com.vinnot.wine.application.port.in.ReviewWineSubmissionUseCase;
import com.vinnot.wine.application.port.in.SearchWineSubmissionsUseCase;
import com.vinnot.wine.application.query.model.GetWineSubmissionQuery;
import com.vinnot.wine.application.query.model.SearchWineSubmissionsQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;
import com.vinnot.wine.application.query.response.WineSubmissionImageResponse;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.infrastructure.web.request.WineSubmissionDecisionRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/wine-submissions")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@Tag(name = "Admin - Wine Submissions", description = "Wine proposal moderation")
@RequiredArgsConstructor
public class WineSubmissionAdminController {

    private final SearchWineSubmissionsUseCase searchUseCase;
    private final GetWineSubmissionUseCase getUseCase;
    private final GetWineSubmissionImageUseCase getImageUseCase;
    private final ReviewWineSubmissionUseCase reviewUseCase;

    @GetMapping
    @Operation(summary = "Search wine submissions")
    public ResponseEntity<PageResult<WineSubmissionDetailsResponse>> list(
            @RequestParam(required = false) WineSubmissionStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(searchUseCase.execute(
                new SearchWineSubmissionsQuery(status, search, page, size)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a wine submission")
    public ResponseEntity<WineSubmissionDetailsResponse> get(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(getUseCase.execute(
                new GetWineSubmissionQuery(
                        id, UUID.fromString(principal), true)));
    }

    @PatchMapping("/{id}/decision")
    @Operation(summary = "Decide a pending wine submission")
    public ResponseEntity<WineSubmissionResponse> decide(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID id,
            @Valid @RequestBody WineSubmissionDecisionRequest request) {
        var catalogData = new WineSubmissionCatalogData(
                request.getWineName(), request.getWineryName(), request.getWineType(),
                request.getVintage(), request.getGrapes(), request.getCountry(),
                request.getRegion(), request.getAlcoholContent());
        return ResponseEntity.ok(reviewUseCase.execute(
                new ReviewWineSubmissionCommand(
                        id, UUID.fromString(principal), request.getDecision(),
                        request.getReason(), request.getTargetWineId(), catalogData)));
    }

    @GetMapping("/{id}/image")
    @Operation(summary = "Read a quarantined wine-label image")
    public ResponseEntity<InputStreamResource> image(@PathVariable UUID id) {
        WineSubmissionImageResponse file = getImageUseCase.execute(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(new InputStreamResource(file.content()));
    }
}
