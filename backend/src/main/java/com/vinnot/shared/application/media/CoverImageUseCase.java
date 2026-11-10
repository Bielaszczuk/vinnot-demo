package com.vinnot.shared.application.media;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import java.io.InputStream;
import java.util.UUID;

public interface CoverImageUseCase {
    enum Kind { EVENT, WINE_ROUTE }
    record Upload(UUID owner, Kind kind, InputStream content, String contentType, long size) { }
    record Result(UUID id, String imageUrl, int width, int height, int size) { }
    Result upload(Upload upload);
    FileStoragePort.StoredFile read(UUID id, ResourceReader reader);
    String validateReference(String imageUrl, String previousUrl, Kind kind);
    void reconcile(String imageUrl);
}
