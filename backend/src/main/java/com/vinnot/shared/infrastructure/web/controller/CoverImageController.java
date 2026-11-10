package com.vinnot.shared.infrastructure.web.controller;

import com.vinnot.shared.application.media.CoverImageUseCase;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/uploads/covers")
public class CoverImageController {
    private final CoverImageUseCase images;
    public CoverImageController(CoverImageUseCase images) { this.images = images; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("(#kind.name() == 'EVENT' and (hasAuthority('EVENT_CREATE') or hasAuthority('EVENT_UPDATE') or hasAuthority('EVENT_UPDATE_OWN')))"
            + " or (#kind.name() == 'WINE_ROUTE' and (hasAuthority('WINE_ROUTE_CREATE') or hasAuthority('WINE_ROUTE_UPDATE') or hasAuthority('WINE_ROUTE_UPDATE_OWN')))")
    public CoverImageUseCase.Result upload(@RequestParam CoverImageUseCase.Kind kind,
            @RequestParam MultipartFile file, @AuthenticationPrincipal String principal) throws IOException {
        try (var content = file.getInputStream()) {
            return images.upload(new CoverImageUseCase.Upload(UUID.fromString(principal), kind, content, file.getContentType(), file.getSize()));
        }
    }

    @GetMapping("/{id}.webp")
    public ResponseEntity<InputStreamResource> read(@PathVariable UUID id, Authentication authentication) {
        var file = images.read(id, AuthorizationUtils.resourceReader(authentication));
        // Authorization is re-evaluated per request; private drafts never enter public/disk caches.
        return ResponseEntity.ok().contentType(MediaType.valueOf(file.contentType())).contentLength(file.size())
                .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(file.content()));
    }
}
