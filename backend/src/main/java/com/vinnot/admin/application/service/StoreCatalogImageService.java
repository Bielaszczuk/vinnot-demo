package com.vinnot.admin.application.service;

import com.vinnot.admin.application.port.in.StoreCatalogImageUseCase;
import com.vinnot.shared.application.port.FileStoragePort;
import java.io.ByteArrayInputStream;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StoreCatalogImageService implements StoreCatalogImageUseCase {
    private final FileStoragePort storage;

    @Override
    public String execute(byte[] image, String contentType) {
        return storage.storeWineLabel(new ByteArrayInputStream(image), "catalog.jpg",
                contentType, image.length, UUID.randomUUID());
    }
}
