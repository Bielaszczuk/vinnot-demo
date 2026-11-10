package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.wine.application.command.model.ScanWineLabelCommand;
import com.vinnot.wine.application.command.model.AttachWineLabelImageCommand;
import com.vinnot.wine.application.port.in.ScanWineLabelUseCase;
import com.vinnot.wine.application.port.in.AttachWineLabelImageUseCase;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.application.query.response.WineLabelImageAttachmentResponse;
import com.vinnot.wine.infrastructure.web.WineLabelObservedTextValidator;
import com.vinnot.wine.infrastructure.web.WineLabelUploadValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/wines")
@Tag(name = "Wine Label Scanning", description = "Authenticated mobile wine-label recognition")
@RequiredArgsConstructor
public class WineLabelScanController {

    private final ScanWineLabelUseCase scanWineLabelUseCase;
    private final WineLabelUploadValidator uploadValidator;
    private final WineLabelObservedTextValidator observedTextValidator;
    private final AttachWineLabelImageUseCase attachWineLabelImageUseCase;

    @PostMapping(
            path = "/{wineId}/label-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Attach a verified scan image to an image-less wine")
    public ResponseEntity<WineLabelImageAttachmentResponse> attachLabelImage(
            @AuthenticationPrincipal String principal,
            @PathVariable UUID wineId,
            @RequestParam("image") MultipartFile image) {
        WineLabelUploadValidator.ValidatedImage validated =
                uploadValidator.validateAndSanitizeForPersistence(image);
        return ResponseEntity.ok(attachWineLabelImageUseCase.execute(
                new AttachWineLabelImageCommand(
                        UUID.fromString(principal), wineId, validated.bytes(),
                        validated.contentType(), image.getOriginalFilename())));
    }

    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Recognize a wine label and rank catalog matches")
    public ResponseEntity<WineLabelScanResponse> scan(
            @AuthenticationPrincipal String principal,
            @RequestParam("image") MultipartFile image,
            @RequestParam(name = "observedText", required = false)
            List<String> observedText) {
        Objects.requireNonNull(principal, "Authenticated user is required");
        WineLabelUploadValidator.ValidatedImage validated = uploadValidator.validate(image);
        return ResponseEntity.ok(scanWineLabelUseCase.execute(
                new ScanWineLabelCommand(
                        validated.bytes(),
                        validated.contentType(),
                        observedTextValidator.validate(observedText),
                        UUID.fromString(principal))));
    }
}
