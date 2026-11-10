package com.vinnot.shared.application.service;

import com.vinnot.shared.application.dto.PublicFileResponse;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.application.port.in.GetPublicUploadUseCase;
import org.springframework.stereotype.Service;

import java.util.Optional;

/** Application boundary for retrieving public, immutable upload content. */
@Service
public class PublicUploadService implements GetPublicUploadUseCase {

    private final FileStoragePort fileStoragePort;

    public PublicUploadService(FileStoragePort fileStoragePort) {
        this.fileStoragePort = fileStoragePort;
    }

    @Override
    public PublicFileResponse getAvatar(String filename) {
        return toResponse(fileStoragePort.loadAvatar(filename));
    }

    @Override
    public PublicFileResponse getWineLabel(String filename) {
        return toResponse(fileStoragePort.loadWineLabel(filename));
    }

    @Override
    public Optional<PublicFileResponse> getSocialMedia(String key) {
        return fileStoragePort.loadSocialMedia(key).map(this::toResponse);
    }

    private PublicFileResponse toResponse(FileStoragePort.StoredFile storedFile) {
        return new PublicFileResponse(
                storedFile.content(), storedFile.contentType(), storedFile.size());
    }
}
