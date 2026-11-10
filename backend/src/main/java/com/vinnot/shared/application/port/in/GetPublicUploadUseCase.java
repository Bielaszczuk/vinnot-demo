package com.vinnot.shared.application.port.in;

import com.vinnot.shared.application.dto.PublicFileResponse;

import java.util.Optional;

/** Retrieves immutable public media without exposing the storage adapter to HTTP. */
public interface GetPublicUploadUseCase {

    PublicFileResponse getAvatar(String filename);

    PublicFileResponse getWineLabel(String filename);

    /** Rendered social media; empty when the key holds no object, IllegalArgumentException for an invalid key. */
    Optional<PublicFileResponse> getSocialMedia(String key);
}
