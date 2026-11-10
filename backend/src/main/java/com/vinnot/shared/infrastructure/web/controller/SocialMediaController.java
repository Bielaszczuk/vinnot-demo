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
import java.util.Optional;

/** Serves rendered social media in local and S3 mode; R2 objects are public on the CDN host instead. */
@RestController
@RequestMapping("/uploads/social")
public class SocialMediaController {

    private static final Duration ONE_YEAR = Duration.ofDays(365);

    private final GetPublicUploadUseCase uploads;

    public SocialMediaController(GetPublicUploadUseCase uploads) {
        this.uploads = uploads;
    }

    /** Keys are versioned by content, so a stored object never changes and may be cached as immutable. */
    @GetMapping("/{*key}")
    public ResponseEntity<InputStreamResource> read(@PathVariable String key) {
        Optional<PublicFileResponse> file;
        try {
            file = uploads.getSocialMedia(key.startsWith("/") ? key.substring(1) : key);
        } catch (IllegalArgumentException invalidKey) {
            return ResponseEntity.notFound().build();
        }
        return file.map(SocialMediaController::body).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private static ResponseEntity<InputStreamResource> body(PublicFileResponse file) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                .cacheControl(CacheControl.maxAge(ONE_YEAR).cachePublic().immutable())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(file.content()));
    }
}
