package com.vinnot.admin.application.service;

import com.vinnot.shared.application.port.FileStoragePort;
import java.io.InputStream;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class StoreCatalogImageServiceTest {
    @Test
    void storesThroughThePortWithServerOwnedIdentity() {
        FileStoragePort storage = mock(FileStoragePort.class);
        when(storage.storeWineLabel(any(InputStream.class), eq("catalog.jpg"),
                eq("image/jpeg"), eq(3L), any(UUID.class))).thenReturn("https://example.com/catalog.jpg");
        String url = new StoreCatalogImageService(storage).execute(new byte[]{1, 2, 3}, "image/jpeg");
        assertThat(url).isEqualTo("https://example.com/catalog.jpg");
        verify(storage).storeWineLabel(any(InputStream.class), eq("catalog.jpg"),
                eq("image/jpeg"), eq(3L), any(UUID.class));
    }
}
