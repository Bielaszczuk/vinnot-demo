package com.vinnot.shared.infrastructure.web.controller;

import com.vinnot.shared.application.dto.PublicFileResponse;
import com.vinnot.shared.application.port.in.GetPublicUploadUseCase;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/uploads")
public class UploadController {

    private static final int AVATAR_CACHE_DAYS = 30;

    private final GetPublicUploadUseCase getPublicUploadUseCase;

    public UploadController(GetPublicUploadUseCase getPublicUploadUseCase) {
        this.getPublicUploadUseCase = getPublicUploadUseCase;
    }

    @GetMapping("/avatars/{filename:.+}")
    public ResponseEntity<InputStreamResource> getAvatar(@PathVariable String filename) {
        PublicFileResponse file = getPublicUploadUseCase.getAvatar(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(AVATAR_CACHE_DAYS)).cachePublic())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(new InputStreamResource(file.content()));
    }

    @GetMapping("/wine-labels/{filename:.+}")
    public ResponseEntity<InputStreamResource> getWineLabel(@PathVariable String filename) {
        PublicFileResponse file = getPublicUploadUseCase.getWineLabel(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(AVATAR_CACHE_DAYS)).cachePublic())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(new InputStreamResource(file.content()));
    }
}
