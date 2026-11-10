package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.port.in.StoreCatalogImageUseCase;
import com.vinnot.wine.infrastructure.web.WineLabelUploadValidator;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/catalog-images")
@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
@RequiredArgsConstructor
public class CatalogImageAdminController {
    private final StoreCatalogImageUseCase storeImage;
    private final WineLabelUploadValidator validator;

    public record ImageRequest(@NotBlank @Size(max = 7_000_000) String dataUrl) {
    }

    public record ImageResponse(String imageUrl) {
    }

    @PostMapping
    public ImageResponse upload(@Valid @RequestBody ImageRequest request) {
        String source = request.dataUrl();
        int delimiter = source.indexOf(";base64,");
        if (!source.startsWith("data:image/") || delimiter < 0) {
            throw new IllegalArgumentException("Expected a base64 JPEG or PNG image");
        }
        String contentType = source.substring("data:".length(), delimiter);
        byte[] bytes = Base64.getDecoder().decode(source.substring(delimiter + ";base64,".length()));
        var image = validator.sanitizeCatalogImage(bytes, contentType);
        return new ImageResponse(storeImage.execute(image.bytes(), image.contentType()));
    }
}
