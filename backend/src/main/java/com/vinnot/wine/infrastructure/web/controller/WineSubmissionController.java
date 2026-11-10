package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.wine.application.command.model.SubmitWineCommand;
import com.vinnot.wine.application.port.in.SubmitWineUseCase;
import com.vinnot.wine.application.port.in.GetMyWineSubmissionsUseCase;
import com.vinnot.wine.application.port.in.GetWineSubmissionUseCase;
import com.vinnot.wine.application.query.model.GetMyWineSubmissionsQuery;
import com.vinnot.wine.application.query.model.GetWineSubmissionQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;
import com.vinnot.wine.infrastructure.web.WineLabelUploadValidator;
import com.vinnot.wine.infrastructure.web.request.WineSubmissionForm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Objects;
import java.util.UUID;
import com.vinnot.wine.domain.model.WineSubmissionStatus;

@RestController
@RequestMapping("/wines/submissions")
@Tag(name = "Wine Submissions", description = "Moderated user catalog proposals")
@RequiredArgsConstructor
public class WineSubmissionController {

    private final SubmitWineUseCase submitWineUseCase;
    private final WineLabelUploadValidator uploadValidator;
    private final GetMyWineSubmissionsUseCase getMySubmissionsUseCase;
    private final GetWineSubmissionUseCase getSubmissionUseCase;

    @GetMapping
    @Operation(summary = "List the current user's wine submissions")
    public ResponseEntity<PageResult<WineSubmissionDetailsResponse>> listMine(
            @AuthenticationPrincipal String principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(getMySubmissionsUseCase.execute(
                new GetMyWineSubmissionsQuery(UUID.fromString(principal), page, size)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one wine submission owned by the current user")
    public ResponseEntity<WineSubmissionDetailsResponse> getMine(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(principal);
        return ResponseEntity.ok(getSubmissionUseCase.execute(
                new GetWineSubmissionQuery(id, userId, false)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit an unknown wine for automatic review")
    public ResponseEntity<WineSubmissionResponse> submit(
            @AuthenticationPrincipal String principal,
            @Valid @ModelAttribute WineSubmissionForm form,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        // No image part means "no photo at hand"; an empty part is still a broken upload.
        WineLabelUploadValidator.ValidatedImage validated = Objects.isNull(image)
                ? null : uploadValidator.validateAndSanitizeForPersistence(image);
        WineSubmissionResponse response = submitWineUseCase.execute(
                new SubmitWineCommand(
                        UUID.fromString(principal),
                        form.getWineName(),
                        form.getWineryName(),
                        form.getWineType(),
                        form.getVintage(),
                        form.getGrapes(),
                        form.getCountry(),
                        form.getRegion(),
                        form.getAlcoholContent(),
                        form.getNotes(),
                        Objects.isNull(validated) ? null : validated.bytes(),
                        Objects.isNull(validated) ? null : validated.contentType(),
                        Objects.isNull(image) ? null : image.getOriginalFilename(),
                        form.getWineryId(),
                        form.getCountryId(),
                        form.getRegionId()));
        HttpStatus status = response.status()
                == WineSubmissionStatus.APPROVED
                ? HttpStatus.CREATED : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status).body(response);
    }
}
